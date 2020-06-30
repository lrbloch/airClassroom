import React, { Fragment } from 'react';
import { RecordCard} from "@airtable/blocks/ui";

function ShowAssignments(props){

    return (
    <Fragment>
      <RecordCard record={props.assignmentRecords[0]}> </RecordCard>
    </Fragment>
    );
}

export default ShowAssignments;