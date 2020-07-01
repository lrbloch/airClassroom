import React, { Fragment } from 'react';
import { Box, Heading, expandRecord, Icon } from "@airtable/blocks/ui";

function showIndividualAssignment({record, onClick}){
  return (
    <Fragment>
      <br></br>
      <Box margin={2} padding={3} border="thick" borderRadius={5} overflow="auto">
        <Heading>{record.getCellValue("Assignment")}</Heading> 
            <a
            style={{cursor: 'pointer', flex: 'auto', padding: 8}}
            onClick={() => {
                onClick(record);
            }}
            >
                {record.getCellValue("Due")}
            </a>
      </Box>
    </Fragment>
  );
}

function OverDueAssignments({records, onClick}){
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
            onClick(record);
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

export class ShowAssignments extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      showOverdue: true,
      showIndividualAssignment: false,
      selectedAssignment: null
    };
    this.showHideAssignment = this.showHideAssignment.bind(this);
  }

  render() {
    return (
      <>
      {this.state.showOverdue ? (
        <OverDueAssignments records={this.props.assignmentRecords} onClick={this.showHideAssignment}/>
      ) : (<></>)}
      {this.state.showIndividualAssignment ? (
        <showIndividualAssignment record={this.state.selectedAssignment} onClick={this.showHideAssignment}/>
      ) : (<></>)}
      </>
    );
  }

  showHideAssignment(record){
    console.log("SHOW Assignment: " + record);
    if(!this.state.showIndividualAssignment){
      this.setState({'showOverdue': false});
      this.setState({'showIndividualAssignment': true});
      this.setState({'selectedAssignment': record})
    }
    else{
      this.setState({'showOverdue': true});
      this.setState({'showIndividualAssignment': false});
      this.setState({'selectedAssignment': null})
    }
  }
}

export default ShowAssignments;