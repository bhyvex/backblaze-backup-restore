require('dotenv').config();

const fs = require('fs');
const path = require('path');

const _ = require('lodash');

const logger = require('./logger');
const authenticate = require('./authenticate');
const getBackedUpFiles = require('./getBackedUpFiles');
const uploadFile = require('./uploadFile');
const encryptDecrypt = require('./encryptDecrypt');
const seriesRunner = require('./seriesRunner');

function storageKey(file){
  return encryptDecrypt.encrypt(file);
}

function exclude(file){
  if(file == 'lost+found'){
    return true;
  }
  return false;
}

function getFilesToBackup(){
  const files = [];
  const backupPaths = process.env['BACKUP_RESTORE_PATHS_TO_BACKUP'].split(' ');
  backupPaths.forEach(function(backupPath){
    fs.readdirSync(backupPath).forEach(function(file){
      if(exclude(file)){
        return;
      }
      files.push(path.join(backupPath, file));
    });
  });
  return files;
}

function start(options){
  getBackedUpFiles(options, function(err, response, data){
    if(err){
      throw new Error(err);
    }
    const backedUpFiles = data.files;
    const filesToBackup = getFilesToBackup();
    const tasks = [];
    filesToBackup.forEach(function(file){
      const foundFile = _.find(backedUpFiles, function(backup){
        return backup.fileName == storageKey(file);
      });
      if(!foundFile){
        logger.info('did not find existing backup for: ', file, 'adding task.');
        tasks.push(uploadFile(options, file));
      } else {
        logger.info('found backup!', file);
      }
    });
    seriesRunner(tasks);
  });
}

authenticate(start);
