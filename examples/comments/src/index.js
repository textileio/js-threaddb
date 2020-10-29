import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import { PrivateKey } from "@textile/crypto";
import * as serviceWorker from "./serviceWorker";
import { StateProvider } from "./Comments/Store";
import { QueryParamProvider } from "use-query-params";

// NOTE: We start with a random identity for demo purposes
const identity = PrivateKey.fromRandom();
const callback = async (message) => {
  const sig = identity.sign(message);
  return sig;
};

ReactDOM.render(
  <StateProvider>
    <QueryParamProvider>
      <App identity={identity.public.toString()} callback={callback} />
    </QueryParamProvider>
  </StateProvider>,
  document.getElementById("root")
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
