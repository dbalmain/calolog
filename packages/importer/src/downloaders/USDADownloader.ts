import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import extractZip from 'extract-zip';

export class USDADownloader {
  private readonly BASE_URL = 'https://fdc.nal.usda.gov/fdc-datasets';
  private readonly dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  /**
   * Download a file from URL
   */
  private async downloadFile(url: string, filepath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(filepath);

      https.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Follow redirect
          if (response.headers.location) {
            this.downloadFile(response.headers.location, filepath).then(resolve).catch(reject);
          }
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
   * Note: This is a simplified version. In practice, you'd need to check the actual USDA download URLs
   */
  async downloadDataset(datasetType: 'foundation' | 'sr_legacy' | 'branded'): Promise<string> {
    console.log(`Downloading ${datasetType} dataset...`);

    const filename = `FoodData_Central_${datasetType}_food_json.zip`;
    const zipPath = path.join(this.dataDir, filename);
    const extractPath = path.join(this.dataDir, datasetType);

    // In a real implementation, you would download from actual USDA URLs
    // For now, we'll just create the directory structure
    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath, { recursive: true });
    }

    console.log(`Dataset would be extracted to: ${extractPath}`);
    console.log('NOTE: Please manually download USDA datasets from https://fdc.nal.usda.gov/download-datasets.html');

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
