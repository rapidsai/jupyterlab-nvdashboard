// custom svg type declaration: https://jupyterlab.readthedocs.io/en/stable/extension/ui_components.html#how-to-create-a-new-labicon-from-an-external-svg-file
declare module '..*.svg' {
  const value: string;
  export default value;
}
