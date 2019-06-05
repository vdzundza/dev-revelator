// import '!style-loader!css-loader!./../src/styles.css';
// import "!style-loader!css-loader!@angular/material/prebuilt-themes/indigo-pink.css";
import { configure } from '@storybook/angular';

// automatically import all files ending in *.stories.ts
const req = require.context('../src/stories', true, /\.stories\.ts$/);
function loadStories() {
  req.keys().forEach(filename => req(filename));
}

configure(loadStories, module);
