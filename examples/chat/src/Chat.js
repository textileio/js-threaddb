import React, { useState, useEffect } from "react";
import { Flex, Segment, FlexItem, Chat, Form, Checkbox } from '@fluentui/react-northstar';
import { SendIcon } from '@fluentui/react-icons-northstar';
import { DateTime } from 'luxon';
import randomcolor from 'randomcolor';
import { useStore } from "./Store";
import { AsyncAction } from "./Reducer";

let me = ""

function Message({ _id, content, modified, user }) {
  const time = new DateTime.fromMillis(modified);
  const color = randomcolor({ seed: user })
  return <Chat.Item
    contentPosition={user === me ? 'end' : 'start'}
    attached='top'
    key={_id}
    // Super simple "avatar" colors
    gutter={<div style={{
      width: 24, height: 24,
      borderRadius: 24,
      backgroundColor: color,
    }}/>}
    message={<Chat.Message content={content} author={user} timestamp={time.toRelative()} mine={user===me} />}
  />
}

export function Thread({ identity }) {
  const store = useStore();

  // Some local state
  const [content, setContent] = useState("");

  // Ref for our bottom element
  const endRef = React.useRef(null)

  // Just use the last 8 chars of identity
  me = identity.slice(-8);

  // So we can "scroll down" on new messages
  const scrollToBottom = () => {
    if (!endRef.current) return
    endRef.current.scrollIntoView({ behavior: 'smooth' })
  }
  const values = Object.values(store.state.instances)
  useEffect(scrollToBottom, [values.length])

  // For when a new message is created
  const handleMessage = () => {
    if (content) {
      store.dispatch({
        type: AsyncAction.Add,
        instance: {
          user: me,
          content,
          modified: Date.now(),
        },
      });
    }
    setContent("");
  };

  // For when the sync is toggled
  const handleSync = (_event, { checked }) => {
    console.log(checked)
    store.dispatch({ type: AsyncAction.ToggleSync, checked });
  };

  return (
    <div className='Chat' style={{ height: "100vh"}}>
      <Flex fill column>
        <Checkbox label='Auto-sync' toggle labelPosition='start' onChange={handleSync} />
        <FlexItem grow>
          <div style={{ overflow: 'auto' }}>
            <Chat>
              {Object.values(store.state.instances).map(Message)}
            </Chat>
            <div ref={endRef} />
          </div>
        </FlexItem>
        <FlexItem>
          <Segment color='brand'>
            <Flex>
              <FlexItem grow>
                <Form onSubmit={handleMessage} >
                  <Form.Input
                    onChange={(_event, { value }) => setContent(value)}
                    value={content}
                    clearable inverted fluid inline placeholder='Say something...'
                    icon={<SendIcon />}
                  />
                </Form>
              </FlexItem>
            </Flex>
          </Segment>
        </FlexItem>
      </Flex>
    </div>
  )
}