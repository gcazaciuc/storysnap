import React from 'react';
import addons from '@kadira/storybook-addons';

const styles = {
  notesPanel: {
    margin: 10,
    fontFamily: 'Arial',
    fontSize: 14,
    color: '#444',
    width: '100%',
    overflow: 'auto',
  },
};

export class Notes extends React.Component {
  constructor(...args) {
    super(...args);
    this.state = { text: '' };
    this.onAddNotes = this.onAddNotes.bind(this);
  }

  componentDidMount() {
    const { channel, api } = this.props;
    // Listen to the notes and render it.
    channel.on('kadira/notes/add_notes', this.onAddNotes);

    // Clear the current notes on every story change.
    this.stopListeningOnStory = api.onStory(() => {
      this.onAddNotes('');
    });
  }

  // This is some cleanup tasks when the Notes panel is unmounting.
  componentWillUnmount() {
    if (this.stopListeningOnStory) {
      this.stopListeningOnStory();
    }

    this.unmounted = true;
    const { channel } = this.props;
    channel.removeListener('kadira/notes/add_notes', this.onAddNotes);
  }

  onAddNotes(text) {
    this.setState({ text });
  }

  render() {
    const { text } = this.state;
    const textAfterFormatted = text ? text.trim().replace(/\n/g, '<br />') : '';

    return (
      <div style={styles.notesPanel}>
        <div dangerouslySetInnerHTML={{ __html: textAfterFormatted }} />
      </div>
    );
  }
}

Notes.propTypes = {
  channel: React.PropTypes.object,
  api: React.PropTypes.object,
};

const ADDON_ID = 'storysnap/shots';
const PANEL_ID = 'storysnap/shots/panel';

export function register() {
  addons.register(ADDON_ID, api => {
    const channel = addons.getChannel();
    console.log('Api set up...');
    addons.addPanel(PANEL_ID, {
      title: 'Visual snapshot',
      render: () => <Notes channel={channel} api={api} />,
    });
  });
}