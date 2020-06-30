import { Loader, Button } from '@airtable/blocks/ui';
import React, { Fragment } from 'react';
import { RecordCard, useBase, useRecords } from "@airtable/blocks/ui";
import { render } from 'react-dom';

// const RecordCardExample = () => {
//   const base = useBase();
//   const table = base.getTableByName("Programmers");
//   const queryResult = table.selectRecords();
//   const records = useRecords(queryResult);
//   // Specify which fields are shown with the `fields` prop
//   return <RecordCard record={records[0]} />;
// };

export class ShowRecords extends React.Component {
  
  constructor(props) {
    super(props);
    this.state = {};
  }

  do_load(){

  }

  render() {
    return (
      <div>Record</div>
    )
  }

}