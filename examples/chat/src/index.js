import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import { PrivateKey } from "@textile/crypto";
import { Provider, teamsTheme } from '@fluentui/react-northstar'
import { StateProvider } from "./Store";
import { QueryParamProvider } from "use-query-params";

// NOTE: We start with a random identity for demo purposes
const identity = PrivateKey.fromRandom();
const authCallback = async (message) => {
  const sig = identity.sign(message);
  return sig;
};

ReactDOM.render(
  <StateProvider>
    <QueryParamProvider>
      <Provider theme={teamsTheme}>
        <App identity={identity.public.toString()} callback={authCallback} />
      </Provider>
    </QueryParamProvider>
  </StateProvider>,
  document.getElementById('root')
);
