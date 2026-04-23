import appJson from '../app.json';

export const APP_VERSION: string = appJson.expo.version;
export const APP_BUILD: number = (appJson.expo.android as any).versionCode ?? 0;
export const APP_VERSION_FULL = `v${APP_VERSION} (build ${APP_BUILD})`;
