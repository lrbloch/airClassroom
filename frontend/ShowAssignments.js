import React, { Fragment } from 'react';
import { Box, Heading, expandRecord, Icon } from "@airtable/blocks/ui";
import moment from 'moment';
moment().format();

/** @enum {string} */
export const assignmentDueTypes = {
  OVERDUE: "Overdue",
  TODAY: "Due Today",
  UPCOMING: "Upcoming"
}

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

function DisplayAssignmentList({records, onClick, toggleShow, showHide, assignmentDue}){
  var filteredRecords = filterRecords(records, assignmentDue);
  const recordsDisplay = (filteredRecords !=null && filteredRecords.length > 0) ? filteredRecords.map((record, index) => {
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
          border="thick"
      ><a
        style={{cursor: 'pointer', flex: 'auto', padding: 8}}
        onClick={() => {
            onClick(record);
        }}
        >
        {record.primaryCellValueAsString || 'Untitled Assignment'}
        , 
        {moment(record.getCellValue("Due")).format("MMM d")}
      </a></Box>)
    }) : null;

    return (
      <Fragment>
        <br></br>
          <a
          style={{cursor: 'pointer', flex: 'auto', padding: 8}}
          onClick={() => {
            toggleShow(assignmentDue);
          }}>
            <Heading> {assignmentDue} ({recordsDisplay ? recordsDisplay.length : "0"})
              <Icon name={showHide ? "chevronUp" : "chevronDown"} size={20}/>
            </Heading> 
          </a>
        {showHide && recordsDisplay != null ?
        (
          <Box position="relative" height="auto" overflow="auto">
            {recordsDisplay}
          </Box>
        )
        : (<></>) }
      </Fragment>
    );
}

function filterRecords(records, category) {
  var now = moment();
  switch(category){
    case assignmentDueTypes.OVERDUE:
      return _.filter(records, function (record) {
        return moment(record.getCellValue("Due")).isBefore(now, 'day');
      });
    case assignmentDueTypes.TODAY:
      return _.filter(records, function(record){
        return moment(record.getCellValue("Due")).isSame(moment(), 'day');
      });
    case assignmentDueTypes.UPCOMING:
      return _.filter(records, function(record){
        return moment(record.getCellValue("Due")).isAfter(moment(), 'day');
      });
    default:
      console.error("no type for " + category);
      return null;
  }
}

export class ShowAssignments extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      showLists: true,
      showOverdueList: false,
      showTodayList: false,
      showUpcomingList: false,
      showIndividualAssignment: false,
      selectedAssignment: null
    };
    this.showHideAssignment = this.showHideAssignment.bind(this);
    this.toggleShow = this.toggleShow.bind(this);
  }

  render() {
    return (
      <>
        {this.state.showLists ? (
          <Fragment>
            <DisplayAssignmentList records={this.props.assignmentRecords} onClick={this.showHideAssignment} toggleShow={this.toggleShow} showHide={this.state.showOverdueList} assignmentDue={assignmentDueTypes.OVERDUE}/>
            <DisplayAssignmentList records={this.props.assignmentRecords} onClick={this.showHideAssignment} toggleShow={this.toggleShow} showHide={this.state.showTodayList} assignmentDue={assignmentDueTypes.TODAY}/>
            <DisplayAssignmentList records={this.props.assignmentRecords} onClick={this.showHideAssignment} toggleShow={this.toggleShow} showHide={this.state.showUpcomingList} assignmentDue={assignmentDueTypes.UPCOMING}/>
          </Fragment>
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
      this.setState({'showLists': false});
      this.setState({'showIndividualAssignment': true});
      this.setState({'selectedAssignment': record})
    }
    else{
      this.setState({'showLists': true});
      this.setState({'showIndividualAssignment': false});
      this.setState({'selectedAssignment': null})
    }
  }

  toggleShow(type){
    switch(type){
      case assignmentDueTypes.TODAY:
        this.setState({'showTodayList': !this.state.showTodayList});
        break;
      case assignmentDueTypes.OVERDUE:
        this.setState({'showOverdueList': !this.state.showOverdueList});
        break;
      case assignmentDueTypes.UPCOMING:
        this.setState({'showUpcomingList': !this.state.showUpcomingList});
        break;
      default:
        console.error("No type for " + type);
        break;
    }
  }
}

export default ShowAssignments;