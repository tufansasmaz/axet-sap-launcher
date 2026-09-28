// xlsx-populate'in tarayıcı paketi (browserify UMD) tip bildirimi taşımıyor.
// Sandbox sayfası onu yalnızca xlsxOps.js'e parametre olarak geçiriyor;
// ayrıntılı tip gerekmiyor.
declare module "xlsx-populate/browser/xlsx-populate.min.js" {
  const XlsxPopulate: unknown;
  export default XlsxPopulate;
}
