import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';

if (environment.production) {
  window.console.log = () => {};
  window.console.info = () => {};
  window.console.debug = () => {};
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
