import npm from "rollup-plugin-node-resolve";

export default {
  entry: "rollup-entry.js",
  format: "umd",
  moduleName: "d3",
  plugins: [npm({jsnext: true})],
  dest: "js/d3.js"
};
