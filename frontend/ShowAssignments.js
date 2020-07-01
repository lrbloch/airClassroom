import React, { Fragment } from 'react';
import { Box, Heading, expandRecord, Icon } from "@airtable/blocks/ui";

function OverDueAssignments({records}){
  var filteredRecords = records.filter((record) => record.getCellValue("Due") != null);
  const recordsDisplay = filteredRecords.length > 0 ? filteredRecords.map((record, index) => {
    var dueDate = record.getCellValue("Due") ? new Date(record.getCellValue("Due")) : null;
    if(dueDate < Date.now()){
      return (
        <Box
          fontSize={4}
          paddingX={3}
          paddingY={2}
          marginRight={-2}
          borderBottom="default"
          display="flex"
          alignItems="center"
          overflowY="auto"
          key={index}
      ><a
        style={{cursor: 'pointer', flex: 'auto', padding: 8}}
        onClick={() => {
            expandRecord(record);
        }}
        >
        {dueDate?.toLocaleString()}
        {/* {record.primaryCellValueAsString || 'Unnamed record'} */}
      </a></Box>)
    }
    }) : null;

    return (
      <Fragment>
        <br></br>
        <Box>
          <Heading>Overdue<Icon name="chevronDown" size={20} /></Heading> 
        </Box>
        <Box margin={2} padding={3} border="thick" borderRadius={5} overflow="auto">
            <Box overflow="auto" paddingRight={3}>
                {recordsDisplay}
            </Box>
        </Box>
      </Fragment>
    );
}


function ShowAssignments(props){

    return (
        <OverDueAssignments records={props.assignmentRecords}/>
        // <DueToday records={props.assignmentRecords}/>
        // <DueComingUp records={props.assignmentRecords}/>
    );
}

export default ShowAssignments;