import React, { useEffect } from "react";
import { useQueryParams, StringParam } from "use-query-params";
import { Alert } from '@fluentui/react-northstar';
import { Thread } from "./Chat"
import { useStore } from "./Store";
import { AsyncAction } from "./Reducer";
import './App.css';

function App({ identity, callback }) {
  const [{ uri }] = useQueryParams({ uri: StringParam });
  const store = useStore();
  // Setup storage backend
  useEffect(() => {
    store.dispatch({ type: AsyncAction.Start, uri, identity, callback });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once by specifying empty array
  return (
    <div className="App">
      {store.state.status === "error" && <Alert
        content={store.state.error}
        dismissible
        variables={{
          oof: true,
        }}
        style={{ position: "absolute", left: 0, top: 0, width: '100%', zIndex: 100 }}
        onVisibleChange={() => {
          store.state.error = undefined
          store.state.status = "ready"
        }}
      />}
      <Thread uri={uri} identity={identity} callback={callback} />
    </div>
  );
}

export default App;
