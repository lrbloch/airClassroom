import { Loader, Button } from '@airtable/blocks/ui';
import React, { Fragment } from 'react';
import { RecordCard, useBase, useRecords } from "@airtable/blocks/ui";
import { render } from 'react-dom';

export class ShowAssignments extends React.Component {

  constructor(props) {
    super(props);
  }

  do_load(){
  }

  render() {
    return (<><Fragment><RecordCard record={this.props.assignmentRecords[0]}> </RecordCard></Fragment></>);
  }

}