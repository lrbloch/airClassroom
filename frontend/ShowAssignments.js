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

function OverDueAssignments({records, onClick, toggleShow, showHide, assignmentDue}){
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
            toggleShow(assignmentDue);
          }}>
            <Heading> {assignmentDue} ({recordsDisplay ? recordsDisplay.length : "0"})
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
      showOverdue: true,
      showDueToday: true,
      showUpcoming: true,
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
      {this.state.showOverdue ? (
        <OverDueAssignments records={this.props.assignmentRecords} onClick={this.showHideAssignment} toggleShow={this.toggleShow} showHide={this.state.showOverdueList} assignmentDue={assignmentDueTypes.OVERDUE}/>
      ) : (<></>)}
      {this.state.showDueToday ? (
        <OverDueAssignments records={this.props.assignmentRecords} onClick={this.showHideAssignment} toggleShow={this.toggleShow} showHide={this.state.showTodayList} assignmentDue={assignmentDueTypes.TODAY}/>
      ) : (<></>)}
      {this.state.showUpcoming ? (
        <OverDueAssignments records={this.props.assignmentRecords} onClick={this.showHideAssignment} toggleShow={this.toggleShow} showHide={this.state.showUpcomingList} assignmentDue={assignmentDueTypes.UPCOMING}/>
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
      this.setState({'showUpcoming': false});
      this.setState({'showIndividualAssignment': true});
      this.setState({'selectedAssignment': record})
    }
    else{
      this.setState({'showOverdue': true});
      this.setState({'showDueToday': true});
      this.setState({'showUpcoming': false});
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