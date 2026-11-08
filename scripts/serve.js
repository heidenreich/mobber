// Serves the game locally: `npm start`, then open the printed address.
// (Browsers won't load ES modules from a double-clicked file.)
const { serve } = require("./server");
const port = Number(process.env.PORT) || 8000;
serve(port).then(({ url }) => console.log(`Mobber is rolling at ${url}  (Ctrl+C to stop)`));
