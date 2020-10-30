import React, { useState, useEffect } from "react";
import { Comment, Header, Form, Button, Label, Icon } from "semantic-ui-react";
import Jdenticon from "react-jdenticon";
import "semantic-ui-css/semantic.min.css";
import "react-semantic-toasts/styles/react-semantic-alert.css";
import { SemanticToastContainer, toast } from "react-semantic-toasts";
import { DateTime } from "luxon";
import { useStore } from "./Store";
import { AsyncAction, OuterAction } from "./Reducer";

// Sub-component styles
const dividerStyle = { width: "100%" };
const commentGroupStyle = { margin: "auto" };

export default function ThreadComments({ uri, identity, callback }) {
  const store = useStore();

  // For displaying errors
  useEffect(() => {
    store.state.error &&
      toast({
        type: "error",
        icon: "exclamation",
        title: "Error",
        description: store.state.error,
        animation: "bounce",
        time: 5000,
        onClose: () => store.dispatch({ type: OuterAction.Error, message: "" }),
      });
  }, [store]);

  // Some local state
  const [content, setContent] = useState("");

  // Just use the last 8 chars of identity
  const user = identity.slice(-8);

  // Setup storage backend
  useEffect(() => {
    store.dispatch({ type: AsyncAction.Start, uri, identity, callback });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once by specifying empty array

  // For when a new comment is created
  const handleComment = () => {
    if (content) {
      store.dispatch({
        type: AsyncAction.Add,
        instance: {
          user,
          content,
          modified: Date.now(),
        },
      });
    }
    setContent("");
  };

  // For when a comment is "reacted" to
  const handleReaction = (id) => {
    const instance = store.state.instances[id];
    const index = instance.reactions.indexOf(user);
    if (index >= 0) {
      instance.reactions.splice(index, 1);
    } else {
      instance.reactions.push(user);
    }
    store.dispatch({
      type: AsyncAction.Update,
      instance,
    });
  };

  // For when the comment textbox is updated
  const handleChange = (_e, { value }) => setContent(value);

  // The main app component
  return (
    <div className="thread-comments">
      <Header as="h3" dividing style={dividerStyle}>
        Comments
      </Header>
      <Comment.Group threaded style={commentGroupStyle}>
        {Object.entries(store.state.instances).map(([id, instance]) => {
          const time = new DateTime.fromMillis(instance.modified);
          return (
            <Comment key={id}>
              <div className="avatar">
                <Jdenticon size="35" value={instance.user} />
              </div>
              <Comment.Content>
                <Comment.Author as="a">{instance.user}</Comment.Author>
                <Comment.Metadata>
                  <span>{time.toRelative()}</span>
                </Comment.Metadata>
                <Comment.Text>{instance.content}</Comment.Text>
                <Comment.Actions>
                  <Button as="div" basic labelPosition="left" size="mini">
                    <Label as="a" basic>
                      {instance.reactions.length || 0}
                    </Label>
                    <Button icon size="mini" onClick={() => handleReaction(id)}>
                      <Icon
                        name="heart"
                        color={
                          instance.reactions.includes(user) ? "red" : "black"
                        }
                      />
                    </Button>
                  </Button>
                </Comment.Actions>
              </Comment.Content>
            </Comment>
          );
        })}
        <Form reply onSubmit={handleComment}>
          <Form.TextArea
            onChange={handleChange}
            name="comment"
            value={content}
          />
          <Button
            content="Leave a comment"
            labelPosition="left"
            icon="edit"
            basic
          />
        </Form>
      </Comment.Group>
      <SemanticToastContainer position="top-right" animation="drop" />
    </div>
  );
}
