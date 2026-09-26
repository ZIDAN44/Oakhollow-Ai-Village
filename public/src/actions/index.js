// Public API of the actions layer. Importing this registers every verb.
import './verbs/basic.js';
import './verbs/social.js';
import './verbs/work.js';
import './verbs/civic.js';
import './verbs/crime.js';
import './crime.js'; // listens for broken laws

export { startAction } from './registry.js';
export { stepNpc } from './move.js';
