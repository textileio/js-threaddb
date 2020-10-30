import React, { createContext } from "react";
import { useReducerAsync } from "use-reducer-async";
import { reducer, asyncActionHandlers } from "./Reducer";

export const schema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  title: "comment",
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
    reactions: {
      type: "array",
      items: {
        type: "string",
      },
      default: [],
    },
  },
  required: ["modified", "_id", "content", "user"],
};

let initialState = { instances: {} };

// Default store
export const store = createContext({
  dispatch: () => {},
  state: { ...initialState },
});

const { Provider } = store;

export const StateProvider = ({ children }) => {
  // Create top-level reducer and initial state
  const [state, dispatch] = useReducerAsync(
    reducer,
    initialState,
    asyncActionHandlers
  );
  return <Provider value={{ state, dispatch }}>{children}</Provider>;
};

export const useStore = () => {
  return React.useContext(store);
};
