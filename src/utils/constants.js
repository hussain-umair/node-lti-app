import path from 'path'
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const ltiProvidersFilePath = path.join(__dirname, '../', 'db', 'ltiProviders.json')
export const vidizmoDataFilePath = path.join(__dirname, '../', 'db', 'vidizmoContant.json')
export const PORT = 3000