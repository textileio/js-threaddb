import React, { createContext } from "react";
import { useReducerAsync } from "use-reducer-async";
import { reducer, asyncActionHandlers } from "./Reducer";

// Our basic message schema, for our message collection
export const schema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  title: "message",
  properties: {
    _id: {
      type: "string",
    },
    user: {
      type: "string",
    },
    modified: {
      type: "number",
    },
    content: {
      type: "string",
    },
  },
  required: ["_id", "user", "modified", "content"],
};

// Initial state is just an empty instances object
let initialState = { instances: {} };

// Default store
export const store = createContext({
  dispatch: () => {},
  state: { ...initialState },
});

// Pull the provide out from our context for use later
const { Provider } = store;

// The state provider is a react provider of our store context
export const StateProvider = ({ children }) => {
  // Create top-level reducer and initial state
  const [state, dispatch] = useReducerAsync(
    reducer,
    initialState,
    asyncActionHandlers
  );
  return <Provider value={{ state, dispatch }}>{children}</Provider>;
};

// Use api to make it easier to use our store all over the place
export const useStore = () => {
  return React.useContext(store);
};