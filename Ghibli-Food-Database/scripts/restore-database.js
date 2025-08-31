#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { program } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const DatabaseManager = require('../admin/database-manager');

program
  .name('restore-database')
  .description('Restore database from backup files')
  .version('1.0.0')
  .option('-f, --file <path>', 'backup file to restore from')
  .option('-d, --directory <path>', 'backup directory to list files from', './backup')
  .option('--force', 'skip confirmation prompts')
  .option('--dry-run', 'show what would be restored without executing')
  .parse();

const options = program.opts();

class RestoreManager {
  constructor() {
    this.dbManager = new DatabaseManager();
    this.backupDir = path.resolve(options.directory);
  }

  async listAvailableBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files
        .filter(file => 
          file.startsWith('backup-') && 
          (file.endsWith('.sql') || file.endsWith('.zip') || file.endsWith('.gz'))
        )
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file)
        }));

      // Get file stats
      for (const backup of backupFiles) {
        const stats = await fs.stat(backup.path);
        backup.size = this.formatBytes(stats.size);
        backup.created = stats.birthtime;
        backup.createdString = stats.birthtime.toISOString().split('T')[0] + ' ' + 
                              stats.birthtime.toISOString().split('T')[1].split('.')[0];
      }

      return backupFiles.sort((a, b) => b.created - a.created);
    } catch (error) {
      console.error(chalk.red(`Error reading backup directory: ${error.message}`));
      return [];
    }
  }

  async selectBackupFile() {
    if (options.file) {
      const filePath = path.resolve(options.file);
      try {
        await fs.access(filePath);
        return filePath;
      } catch (error) {
        console.error(chalk.red(`Backup file not found: ${filePath}`));
        process.exit(1);
      }
    }

    const backups = await this.listAvailableBackups();
    
    if (backups.length === 0) {
      console.log(chalk.yellow('No backup files found in the directory'));
      process.exit(1);
    }

    console.log(chalk.blue('\nAvailable backup files:\n'));
    
    const choices = backups.map(backup => ({
      name: `${backup.name} (${backup.size}) - ${backup.createdString}`,
      value: backup.path,
      short: backup.name
    }));

    const { selectedBackup } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedBackup',
        message: 'Select a backup file to restore:',
        choices
      }
    ]);

    return selectedBackup;
  }

  async confirmRestore(backupPath) {
    if (options.force) return true;

    console.log(chalk.yellow('\n⚠️  WARNING: This operation will replace existing data!'));
    console.log(chalk.gray(`Backup file: ${path.basename(backupPath)}`));
    
    const dbInfo = await this.dbManager.getDatabaseInfo();
    console.log(chalk.gray(`Target database: ${dbInfo.database} on ${dbInfo.host}:${dbInfo.port}`));

    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: 'Are you sure you want to proceed with the restore?',
        default: false
      }
    ]);

    return confirmed;
  }

  async performRestore(backupPath) {
    const spinner = ora('Preparing for restore...').start();
    
    try {
      await this.dbManager.testConnection();
      spinner.text = 'Database connected, starting restore...';

      if (options.dryRun) {
        spinner.info(chalk.blue('DRY RUN: Would restore from ' + path.basename(backupPath)));
        return;
      }

      // Check if backup file needs decompression
      if (backupPath.endsWith('.gz')) {
        spinner.text = 'Decompressing backup file...';
        backupPath = await this.decompressBackup(backupPath);
      }

      spinner.text = 'Restoring database...';
      await this.dbManager.restoreBackup(backupPath);

      spinner.succeed(chalk.green('Database restored successfully!'));

      // Show restore summary
      await this.showRestoreSummary();
      
    } catch (error) {
      spinner.fail(chalk.red(`Restore failed: ${error.message}`));
      throw error;
    }
  }

  async decompressBackup(compressedPath) {
    const zlib = require('zlib');
    const { createReadStream, createWriteStream } = require('fs');
    
    const decompressedPath = compressedPath.replace('.gz', '');
    
    return new Promise((resolve, reject) => {
      const readStream = createReadStream(compressedPath);
      const writeStream = createWriteStream(decompressedPath);
      const gunzip = zlib.createGunzip();

      readStream
        .pipe(gunzip)
        .pipe(writeStream)
        .on('finish', () => resolve(decompressedPath))
        .on('error', reject);
    });
  }

  async showRestoreSummary() {
    try {
      const dbInfo = await this.dbManager.getDatabaseInfo();
      const tables = await this.dbManager.getTableStatistics();
      
      console.log(chalk.blue('\n📊 Restore Summary:'));
      console.log('─'.repeat(50));
      console.log(chalk.green(`Database: ${dbInfo.database}`));
      console.log(chalk.green(`Tables restored: ${tables.length}`));
      console.log(chalk.green(`Total size: ${dbInfo.size.size}`));
      
      // Show table row counts
      console.log(chalk.blue('\nTable Statistics:'));
      tables.forEach(table => {
        console.log(`  ${table.tablename}: ${table.live_rows} rows`);
      });
      
    } catch (error) {
      console.log(chalk.yellow(`Could not generate summary: ${error.message}`));
    }
  }

  async validateBackup(backupPath) {
    const spinner = ora('Validating backup file...').start();
    
    try {
      const stats = await fs.stat(backupPath);
      
      if (stats.size === 0) {
        spinner.fail(chalk.red('Backup file is empty'));
        return false;
      }

      if (backupPath.endsWith('.sql') || backupPath.endsWith('.gz')) {
        // For SQL files, check if it contains expected content
        const content = await fs.readFile(backupPath, 'utf8');
        const hasContent = content.includes('CREATE') || content.includes('INSERT') || content.includes('COPY');
        
        if (!hasContent) {
          spinner.fail(chalk.red('Backup file appears to be invalid (no SQL content found)'));
          return false;
        }
      }

      spinner.succeed(chalk.green('Backup file validation passed'));
      return true;
    } catch (error) {
      spinner.fail(chalk.red(`Backup validation failed: ${error.message}`));
      return false;
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async createRestorePoint() {
    console.log(chalk.blue('Creating restore point before proceeding...'));
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const restorePointPath = path.join(this.backupDir, `restore-point-${timestamp}.sql`);
    
    try {
      await this.dbManager.createBackup([], 'sql');
      console.log(chalk.green(`✓ Restore point created: ${path.basename(restorePointPath)}`));
      return restorePointPath;
    } catch (error) {
      console.log(chalk.yellow(`⚠️  Could not create restore point: ${error.message}`));
      return null;
    }
  }
}

async function main() {
  const restoreManager = new RestoreManager();
  
  console.log(chalk.blue('🔄 Ghibli Food Database Restore Tool\n'));
  
  try {
    const backupPath = await restoreManager.selectBackupFile();
    
    // Validate backup file
    const isValid = await restoreManager.validateBackup(backupPath);
    if (!isValid) {
      process.exit(1);
    }

    // Create restore point
    if (!options.dryRun) {
      await restoreManager.createRestorePoint();
    }

    // Confirm restore
    const confirmed = await restoreManager.confirmRestore(backupPath);
    if (!confirmed) {
      console.log(chalk.yellow('Restore cancelled'));
      process.exit(0);
    }

    // Perform restore
    await restoreManager.performRestore(backupPath);
    
    console.log(chalk.green('\n✅ Restore completed successfully!'));
    
  } catch (error) {
    console.error(chalk.red(`\nRestore failed: ${error.message}`));
    
    if (error.message.includes('connection')) {
      console.log(chalk.yellow('\nTroubleshooting tips:'));
      console.log('• Check if the database server is running');
      console.log('• Verify database connection settings in .env file');
      console.log('• Ensure you have proper database permissions');
    }
    
    process.exit(1);
  } finally {
    await restoreManager.dbManager.close();
  }
}

if (require.main === module) {
  main();
}