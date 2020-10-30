import { Database } from "@textile/threaddb";
import { schema } from "./Store";

const name = "comment";
let db;

const MissingCollectionError = "Unable to access required collection";

// Actions that aren't generally directly called from components
export const InnerAction = Object.freeze({
  SetInstances: Symbol("SetInstances"),
  StartAdd: Symbol("StartAdd"),
  EndAdd: Symbol("EndAdd"),
  StartUpdate: Symbol("StartUpdate"),
  EndUpdate: Symbol("EndUpdate"),
  StartDelete: Symbol("StartDelete"),
  EndDelete: Symbol("EndDelete"),
  StartAuth: Symbol("StartAuth"),
  EndAuth: Symbol("EndAuth"),
  StartStart: Symbol("StartStart"),
  EndStart: Symbol("EndStart"),
});

// Actions that are directly called from components
export const OuterAction = Object.freeze({
  Error: Symbol("Error"),
});

// Core reducer, this will be wrapped in our actions middleware
export const reducer = (state, action) => {
  switch (action.type) {
    case InnerAction.StartStart: {
      return {
        ...state,
        loading: "starting",
      };
    }
    case InnerAction.StartAdd:
    case InnerAction.StartUpdate:
    case InnerAction.StartDelete: {
      return {
        ...state,
        loading: "working",
      };
    }
    case InnerAction.StartAuth: {
      return {
        ...state,
        loading: "authenticating",
      };
    }
    case InnerAction.EndAdd:
    case InnerAction.EndUpdate: {
      const { instance } = action;
      instance.reactions = instance.reactions || [];
      const instances = { ...state.instances, [instance._id]: instance };
      return {
        ...state,
        loading: undefined,
        instances,
      };
    }
    case InnerAction.SetInstances: {
      const instances = {};
      action.instances.forEach((instance) => {
        instance.reactions = instance.reactions || [];
        instances[instance._id] = instance;
      });
      return {
        ...state,
        instances,
      };
    }
    case InnerAction.EndStart:
    case InnerAction.EndAuth: {
      return {
        ...state,
        loading: undefined,
      };
    }
    case InnerAction.EndDelete: {
      const { [action._id]: _, ...instances } = state.instances;
      return {
        ...state,
        loading: undefined,
        instances,
      };
    }
    case OuterAction.Error: {
      return {
        ...state,
        loading: undefined,
        error: action.message,
      };
    }
    default:
      return state;
  }
};

export const AsyncAction = Object.freeze({
  Start: Symbol("Start"),
  Add: Symbol("Add"),
  Delete: Symbol("Delete"),
  Update: Symbol("Update"),
  Auth: Symbol("Auth"),
});

// interface AsyncActionHandler<R extends Reducer<any, any>> {
//   dispatch: Dispatch<ReducerAction<R>>;
//   getState: () => ReducerState<R>;
//   signal: AbortSignal;
// }

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
      // Initialize the remote db... or just skip out if it already exists
      try {
        // TODO: Carson remove this stuff
        db.remote.config.serviceHost = "https://webapi.hub.textile.io";
        db.remote.config.metadata.set(
          "x-textile-api-key",
          "bcjam75tatl4dv4x3xievpi6w34"
        );
        await db.remote.authorize(identity, callback);
        await db.remote.initialize(uri);
      } catch (err) {
        if (err.message.includes("Remote db/thread already exists")) {
          db.remote.set({ id: uri });
        } else {
          throw err;
        }
      }
      db.remote.config.metadata.set("x-textile-thread-name", db.dexie.name);
      db.remote.config.metadata.set("x-textile-thread", db.id);
      // Do it intially....
      await db.remote.pull(name);
      const instances = await db.collection(name).find().sortBy("_id");
      dispatch({ type: InnerAction.SetInstances, instances });
      // And then again every 10 seconds...
      let test;
      setInterval(async () => {
        try {
          // TODO: Add some exponential backoff here to deal with being offline?
          // Less important for something like comments, but useful for something like chat.
          await db.remote.createStash(name);
          await db.remote.pull(name);
          test = await db.remote.storage._stash.toCollection().toArray();
          await db.remote.applyStash(name);
          await db.remote.push(name);
          const instances = await db.collection(name).find().sortBy("_id");
          dispatch({ type: InnerAction.SetInstances, instances });
        } catch (e) {
          let err = e.toString();
          if (e.errors) {
            for (const { message } of e.errors) {
              err += `: ${message}`;
            }
          }
          dispatch({ type: OuterAction.Error, message: err });
        }
      }, 10000);

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
  [AsyncAction.Update]: ({ dispatch }) => async (action) => {
    dispatch({ type: InnerAction.StartUpdate });
    try {
      const Collection = db.collection(name);
      if (Collection) {
        await Collection.save(action.instance);
        dispatch({ type: InnerAction.EndUpdate, instance: action.instance });
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
  [AsyncAction.Auth]: ({ dispatch }) => async (action) => {
    dispatch({ type: InnerAction.StartAuth });
    try {
      dispatch({ type: InnerAction.EndAuth });
    } catch (e) {
      dispatch({ type: OuterAction.Error, message: e.toString() });
    }
  },
};
