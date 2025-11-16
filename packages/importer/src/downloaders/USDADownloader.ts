import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import extractZip from 'extract-zip';

export class USDADownloader {
  // USDA dataset URLs (these are known stable URLs)
  private readonly DATASET_URLS: Record<string, string> = {
    foundation: 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_json_2022-10-28.zip',
    sr_legacy: 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2021-10-28.zip',
    branded: 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_branded_food_json_2022-10-28.zip'
  };

  private readonly dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  /**
   * Download a file from URL with progress
   */
  private async downloadFile(url: string, filepath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(filepath);

      https.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          file.close();
          fs.unlinkSync(filepath);
          // Follow redirect
          if (response.headers.location) {
            this.downloadFile(response.headers.location, filepath).then(resolve).catch(reject);
          } else {
            reject(new Error('Redirect without location header'));
          }
          return;
        }

        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(filepath);
          reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
          return;
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve();
        });

        file.on('error', (err) => {
          fs.unlink(filepath, () => {});
          reject(err);
        });
      }).on('error', (err) => {
        fs.unlink(filepath, () => {});
        reject(err);
      });
    });
  }

  /**
   * Download and extract USDA dataset
   */
  async downloadDataset(datasetType: 'foundation' | 'sr_legacy' | 'branded'): Promise<string> {
    const url = this.DATASET_URLS[datasetType];
    if (!url) {
      throw new Error(`Unknown dataset type: ${datasetType}`);
    }

    const filename = `${datasetType}.zip`;
    const zipPath = path.join(this.dataDir, filename);
    const extractPath = path.join(this.dataDir, datasetType);

    // Check if already extracted
    if (fs.existsSync(extractPath)) {
      const files = fs.readdirSync(extractPath);
      if (files.length > 0) {
        // Dataset already exists
        return extractPath;
      }
    }

    // Download the file
    try {
      await this.downloadFile(url, zipPath);
    } catch (error: any) {
      throw new Error(`Failed to download ${datasetType}: ${error.message}`);
    }

    // Extract the ZIP file
    try {
      if (!fs.existsSync(extractPath)) {
        fs.mkdirSync(extractPath, { recursive: true });
      }

      await extractZip(zipPath, { dir: path.resolve(extractPath) });

      // Clean up ZIP file
      fs.unlinkSync(zipPath);
    } catch (error: any) {
      throw new Error(`Failed to extract ${datasetType}: ${error.message}`);
    }

    return extractPath;
  }

  /**
   * Check if dataset exists
   */
  datasetExists(datasetType: string): boolean {
    const extractPath = path.join(this.dataDir, datasetType);
    return fs.existsSync(extractPath);
  }

  /**
   * Get dataset path
   */
  getDatasetPath(datasetType: string): string {
    return path.join(this.dataDir, datasetType);
  }
}
