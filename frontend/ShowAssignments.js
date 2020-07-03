import React, { Fragment } from 'react';
import { Box, Heading, expandRecord, Icon } from "@airtable/blocks/ui";
import moment from 'moment';
moment().format();

function ShowIndividualAssignment({record, onClick}){
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

function OverDueAssignments({records, onClick, toggleShow, showHide}){
  var now = moment();
  var filteredRecords = _.filter(records, function(record){
    return moment(record.getCellValue("Due")).isBefore(now, 'day');
  });
  const recordsDisplay = filteredRecords.length > 0 ? filteredRecords.map((record, index) => {
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
        {moment(record.getCellValue("Due")).format("MMM d")}
        {/* {record.primaryCellValueAsString || 'Unnamed record'} */}
      </a></Box>)
    }) : null;

    return (
      <Fragment>
        <br></br>
        <Box>
          <a
          style={{cursor: 'pointer', flex: 'auto', padding: 8}}
          onClick={() => {
            toggleShow('overdue');
          }}>
            <Heading>Overdue ({recordsDisplay ? recordsDisplay.length : "0"})
              <Icon name={showHide ? "chevronUp" : "chevronDown"} size={20}/>
            </Heading> 
          </a>
        </Box>
        {showHide ?
        (
        <Box margin={2} padding={3} border="thick" borderRadius={5} overflow="auto">
            <Box overflow="auto" paddingRight={3}>
                {recordsDisplay}
            </Box>
        </Box>
        )
        : (<></>) }
      </Fragment>
    );
}

function DueTodayAssignments({records, onClick, toggleShow, showHide}){
  var filteredRecords = _.filter(records, function(record){
    return moment(record.getCellValue("Due")).isSame(moment(), 'day');
  });
  const recordsDisplay = filteredRecords.length > 0 ? filteredRecords.map((record, index) => {
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
        {moment(record.getCellValue("Due")).format("LT")}
      </a></Box>)
    }) : null;

    return (
      <Fragment>
        <br></br>
        <Box>
          <a
          style={{cursor: 'pointer', flex: 'auto', padding: 8}}
          onClick={() => {
            toggleShow('today');
          }}>
            <Heading>Due Today ({recordsDisplay ? recordsDisplay.length : "0"})
              <Icon name={showHide ? "chevronUp" : "chevronDown"} size={20}/>
            </Heading> 
          </a>
        </Box>
        {showHide? (
        <Box margin={2} padding={3} border="thick" borderRadius={5} overflow="auto">
            <Box overflow="auto" paddingRight={3}>
                {recordsDisplay}
            </Box>
        </Box>
        ):(<></>)}
      </Fragment>
    );
}

export class ShowAssignments extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      showOverdue: true,
      showDueToday: true,
      showOverdueList: false,
      showTodayList: false,
      showIndividualAssignment: false,
      selectedAssignment: null
    };
    this.showHideAssignment = this.showHideAssignment.bind(this);
    this.toggleShow = this.toggleShow.bind(this);
  }

  render() {
    return (
      <>
      {this.state.showOverdue ? (
        <OverDueAssignments records={this.props.assignmentRecords} onClick={this.showHideAssignment} toggleShow={this.toggleShow} showHide={this.state.showOverdueList}/>
      ) : (<></>)}
      {this.state.showDueToday ? (
        <DueTodayAssignments records={this.props.assignmentRecords} onClick={this.showHideAssignment} toggleShow={this.toggleShow} showHide={this.state.showTodayList}/>
      ) : (<></>)}
      {this.state.showIndividualAssignment ? (
        <ShowIndividualAssignment record={this.state.selectedAssignment} onClick={this.showHideAssignment}/>
      ) : (<></>)}
      </>
    );
  }

  showHideAssignment(record){
    console.log("SHOW Assignment: " + record);
    if(!this.state.showIndividualAssignment){
      this.setState({'showOverdue': false});
      this.setState({'showDueToday': false});
      this.setState({'showIndividualAssignment': true});
      this.setState({'selectedAssignment': record})
    }
    else{
      this.setState({'showOverdue': true});
      this.setState({'showDueToday': true});
      this.setState({'showIndividualAssignment': false});
      this.setState({'selectedAssignment': null})
    }
  }

  toggleShow(type){
    switch(type){
      case 'today':
        this.setState({'showTodayList': !this.state.showTodayList});
        break;
      case 'overdue':
        this.setState({'showOverdueList': !this.state.showOverdueList});
        break;
    }
  }
}

export default ShowAssignments;