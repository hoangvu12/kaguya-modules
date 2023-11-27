import axios, { AxiosRequestConfig } from "axios";
import { JSDOM } from "jsdom";

export type ExecuteCodeFunction = <T>(
  functionName: string,
  args?: Record<string, any>
) => Promise<T>;

const sendRequest = async (config: AxiosRequestConfig<any>) => {
  const response = await axios(config);

  return {
    data: response.data,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  };
};

export const createExecutor = () => {
  const dom = new JSDOM("<html><body><h1>Hello world</h1></body></html>", {
    runScripts: "dangerously",
    resources: "usable",
  });

  function loadScript(url: string) {
    return new Promise((resolve, reject) => {
      if (dom.window.document.querySelector(`script[src="${url}"]`)) {
        resolve("");
        return;
      }

      const script = dom.window.document.createElement("script");

      script.src = url;
      script.onload = resolve;
      script.onerror = reject;

      dom.window.document.head.appendChild(script);
    });
  }

  dom.window.sendRequest = sendRequest;
  dom.window.loadScript = loadScript;

  const executeCode: ExecuteCodeFunction = (functionName, args) => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout"));
      }, 30000);

      dom.window.sendResponse = (data: any) => {
        clearTimeout(timeout);

        resolve(data);
      };

      dom.window.eval(`
        ${functionName}(${JSON.stringify(args)});
      `);
    });
  };

  const injectCode = (code: string) => {
    dom.window.eval("window.anime = {};");

    dom.window.eval(code);
  };

  return { dom, injectCode, executeCode };
};
