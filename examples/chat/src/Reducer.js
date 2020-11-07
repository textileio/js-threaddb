import { Database } from "@textile/threaddb";
import { schema } from "./Store";
import dotenv from "dotenv"

// Dot env config
dotenv.config();

// Default name for our collection
const name = "comment";

// Global reference to our database
let db;

// Just a handle common error
const MissingCollectionError = "Unable to access required collection";

// Actions that aren't generally directly called from app
export const InnerAction = Object.freeze({
  StartSync: Symbol("StartSync"),
  EndSync: Symbol("EndSync"),
  StartAdd: Symbol("StartAdd"),
  EndAdd: Symbol("EndAdd"),
  StartAuth: Symbol("StartAuth"),
  EndAuth: Symbol("EndAuth"),
  StartStart: Symbol("StartStart"),
  EndStart: Symbol("EndStart"),
  SetTarget: Symbol("SetTarget")
});

// Actions that are directly called from app
export const OuterAction = Object.freeze({
  Error: Symbol("Error"),
});

// Core reducer, this will be wrapped in our actions middleware
export const reducer = (state, action) => {
  switch (action.type) {
    case InnerAction.StartStart: {
      return {
        ...state,
        status: "starting",
      };
    }
    case InnerAction.StartAdd:
    case InnerAction.StartDelete:{
      return {
        ...state,
        status: "working",
      };
    }
    case InnerAction.StartAuth: {
      return {
        ...state,
        status: "authenticating",
      };
    }
    case InnerAction.StartSync: {
      return {
        ...state,
        status: "syncing",
      };
    }
    case InnerAction.EndAdd: {
      const { instance } = action;
      const instances = { ...state.instances, [instance._id]: instance };
      return {
        ...state,
        status: "ready",
        instances,
      };
    }
    case InnerAction.EndSync: {
      const instances = {};
      action.instances.forEach((instance) => {
        instances[instance._id] = instance;
      });
      return {
        ...state,
        instances,
        status: "ready",
      };
    }
    case InnerAction.EndStart:
    case InnerAction.EndAuth: {
      return {
        ...state,
        status: "ready",
      };
    }
    case InnerAction.EndDelete: {
      const { [action._id]: _, ...instances } = state.instances;
      return {
        ...state,
        status: "ready",
        instances,
      };
    }
    case InnerAction.SetTarget: {
      return {
        ...state,
        target: action.target,
      };
    }
    case OuterAction.Error: {
      return {
        ...state,
        status: "error",
        error: action.message,
      };
    }
    default:
      return state;
  }
};

// The top-level async actions that our app will actually dispatch
// NOTE: We've left some "extras" in there to play with
export const AsyncAction = Object.freeze({
  Start: Symbol("Start"),
  Add: Symbol("Add"),
  Delete: Symbol("Delete"),
  ToggleSync: Symbol("Sync"),
  Auth: Symbol("Auth"),
});

// Async "reducer" to calls our core reducer methods
export const asyncActionHandlers = {
  [AsyncAction.Start]: ({ dispatch }) => async ({
    identity,
    uri,
    callback,
  }) => {
    dispatch({ type: InnerAction.StartStart });
    try {
      db = new Database(`${name}-${identity.slice(-8)}`, {
        name,
        schema,
      });
      // Open the database for operations
      await db.open(1);
      // Initialize the remote db...
      const remote = await db.remote.setKeyInfo({ key: process.env.REACT_APP_HUB_KEY })
      // If we throw here, our error catcher will grab it later on down the line
      await remote.authorize(identity, callback);
      await remote.initialize(uri);
      // Low-level features of working against the hub... should be simplified
      remote.config.metadata.set("x-textile-thread-name", db.dexie.name);
      remote.config.metadata.set("x-textile-thread", db.id);

      // We'll structure our app to use query parameters to define the thread id
      if (uri === undefined && window.history.pushState) {
        const newURL = new URL(window.location.href);
        newURL.search = `?uri=${db.remote.id}`;
        window.history.pushState({ path: newURL.href }, "", newURL.href);
      }
      dispatch({ type: InnerAction.EndStart });
    } catch (e) {
      dispatch({ type: OuterAction.Error, message: e.toString() });
    }
  },
  [AsyncAction.ToggleSync]:({ dispatch, getState }) => async ({ checked }) => {
    let { target } = getState()
    if (!checked) {
      clearInterval(target)
      target = null
    } else {
      target = setInterval(async () => {
        const { status } = getState()
        if (status !== "ready") return // noop
        dispatch({ type: InnerAction.StartSync });
        try {
          // Demo a (low-level) flow for stashing, pulling, and rebasing local changes
          await db.remote.createStash(name);
          await db.remote.pull(name);
          await db.remote.applyStash(name);
          await db.remote.push(name);
          const instances = await db.collection(name).find().sortBy("_id");
          dispatch({ type: InnerAction.EndSync, instances });
        } catch (e) {
          // We might run into multiple errors here when we push (due to schema validation)
          let err = e.toString();
          if (e.errors) {
            for (const { message } of e.errors) {
              err += `: ${message}`;
            }
          }
          dispatch({ type: OuterAction.Error, message: err });
        }
      }, 3000) // Every 3 seconds
    }
    dispatch({ type: InnerAction.SetTarget, target });
  },
  [AsyncAction.Add]: ({ dispatch }) => async (action) => {
    dispatch({ type: InnerAction.StartAdd });
    try {
      const Collection = db.collection(name);
      if (Collection) {
        await Collection.insert(action.instance);
        dispatch({ type: InnerAction.EndAdd, instance: action.instance });
      } else {
        dispatch({
          type: OuterAction.Error,
          message: MissingCollectionError,
        });
      }
    } catch (e) {
      dispatch({ type: OuterAction.Error, message: e.toString() });
    }
  },
  [AsyncAction.Delete]: ({ dispatch }) => async (action) => {
    dispatch({ type: InnerAction.StartDelete });
    try {
      const Collection = db.collection(name);
      if (Collection) {
        await Collection.delete(action._id);
        dispatch({ type: InnerAction.EndDelete, _id: action._id });
      } else {
        dispatch({
          type: OuterAction.Error,
          message: MissingCollectionError,
        });
      }
    } catch (e) {
      dispatch({ type: OuterAction.Error, message: e.toString() });
    }
  },
  [AsyncAction.Auth]: ({ dispatch }) => async (_action) => {
    dispatch({ type: InnerAction.StartAuth });
    try {
      dispatch({ type: InnerAction.EndAuth });
    } catch (e) {
      dispatch({ type: OuterAction.Error, message: e.toString() });
    }
  },
};