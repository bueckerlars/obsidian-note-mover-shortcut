declare module 'virtual:languages' {
  const catalogs: Record<string, typeof import('../../languages/en.json')> & {
    en: typeof import('../../languages/en.json');
  };
  export default catalogs;
}
