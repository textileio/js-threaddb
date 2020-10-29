import React, { useState } from "react";
import { Image, Grid, Placeholder } from "semantic-ui-react";
import { useQueryParams, StringParam } from "use-query-params";
import Comments from "./Comments";

// Sub-component styles
const placeholder = { height: 300, width: 400, margin: "auto" };
const grid = { height: "calc(100vh - 7em)", margin: 0 };
const row = { height: "50%", overflowY: "auto" };

// Main app
function App({ identity, callback }) {
  // Get the query params
  const [{ uri }] = useQueryParams({ uri: StringParam });
  // Some local state
  const [loading, setLoading] = useState(true);

  // The main app component
  return (
    <div className="App">
      <Grid container style={grid}>
        <Grid.Row style={row}>
          <Grid.Column>
            {loading ? (
              <Placeholder style={placeholder}>
                <Placeholder.Image />
              </Placeholder>
            ) : null}
            <Image
              centered
              src={`https://picsum.photos/seed/${
                uri ? uri.slice(-8) : Math.random().toString(36).substring(7)
              }/${placeholder.width}/${placeholder.height}`}
              hidden={loading}
              onLoad={() => setLoading(false)}
            />
          </Grid.Column>
        </Grid.Row>
        <Grid.Row style={row}>
          <Grid.Column>
            <Comments uri={uri} identity={identity} callback={callback} />
          </Grid.Column>
        </Grid.Row>
      </Grid>
    </div>
  );
}

export default App;
