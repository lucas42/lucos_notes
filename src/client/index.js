import 'lucos_navbar';
import './components/item-components.js';
import './components/phrasebook-components.js';
import './components/list-components.js';
import './components/sync-button.js';
import { initStreamClient } from './stream.js';
import './load-service-worker.js';

initStreamClient();
