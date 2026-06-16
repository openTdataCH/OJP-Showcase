import os, sys

import datetime

from dataclasses import dataclass, asdict
from typing import List, Optional, Any

def read_safe_json_key(json_data: dict[str, Any], key: str, default_value = None):
    if not key[:1].isupper():
        print('ERROR - this method should be use with UpperCase keys')
        print(key)
        sys.exit(1)
    
    camelCase_indicator = 'n/a - TRY_camelCase'
    
    value = json_data.get(key, camelCase_indicator)
    if value == camelCase_indicator:
        camelCase_key = key[:1].lower() + key[1:]
        value = json_data.get(camelCase_key, default_value)
        
    return value

@dataclass
class Header:
    gtfsRealtimeVersion: str
    incrementality: str
    timestamp: int
    feedVersion: str
  
    @staticmethod
    def from_gtfs_rt_json(json_data: dict):
        gtfsRealtimeVersion_value = read_safe_json_key(json_data, 'GtfsRealtimeVersion')
        if gtfsRealtimeVersion_value is None:
            print('ERROR - Header.from_gtfs_rt_json - GtfsRealtimeVersion cant be None')
            print(json_data)
            sys.exit()
        
        incrementality_value = read_safe_json_key(json_data, 'Incrementality')
        if incrementality_value is None:
            print('ERROR - Header.from_gtfs_rt_json - Incrementality cant be None')
            print(json_data)
            sys.exit()
        
        timestamp_value = read_safe_json_key(json_data, 'Timestamp')
        if timestamp_value is None:
            print('ERROR - Header.from_gtfs_rt_json - Timestamp cant be None')
            print(json_data)
            sys.exit()

        feedVersion_value = read_safe_json_key(json_data, 'FeedVersion')
        if feedVersion_value is None:
            print('ERROR - Header.from_gtfs_rt_json - FeedVersion cant be None')
            print(json_data)
            sys.exit()
        
        # backend might return strings
        timestamp_value = int(timestamp_value)
        
        header = Header(
            gtfsRealtimeVersion=gtfsRealtimeVersion_value,
            incrementality=incrementality_value,
            timestamp=timestamp_value,
            feedVersion=feedVersion_value,
        )
        
        return header
  
@dataclass
class StopTime:
    delay: Optional[int] = None
    time: Optional[int] = None
    scheduleRelationship: Optional[str] = None
  
    @staticmethod
    def from_gtfs_rt_json(json_data: dict):
        stopTime = StopTime()
        stopTime.delay = read_safe_json_key(json_data, 'Delay')
        stopTime.time = read_safe_json_key(json_data, 'Time')
        stopTime.scheduleRelationship = read_safe_json_key(json_data, 'ScheduleRelationship')

        return stopTime
  
@dataclass
class StopTimeUpdate:
    stopSequence: int
    stopId: str
    scheduleRelationship: str
    arrival: Optional[StopTime] = None
    departure: Optional[StopTime] = None
    
    @staticmethod
    def from_gtfs_rt_json(json_data):
        stopSequence_json = read_safe_json_key(json_data, 'StopSequence')
        if stopSequence_json is None:
            print('ERROR - StopTimeUpdate.from_gtfs_rt_json - StopSequence cant be None')
            print(json_data)
            sys.exit()
            
        stopId_json = read_safe_json_key(json_data, 'StopId')
        if stopId_json is None:
            print('ERROR - StopTimeUpdate.from_gtfs_rt_json - StopId cant be None')
            print(json_data)
            sys.exit()
            
        scheduleRelationship_json = read_safe_json_key(json_data, 'ScheduleRelationship')
        if scheduleRelationship_json is None:
            print('ERROR - StopTimeUpdate.from_gtfs_rt_json - ScheduleRelationship cant be None')
            print(json_data)
            sys.exit()

        stopTimeUpdate = StopTimeUpdate(
            stopSequence=stopSequence_json,
            stopId=stopId_json,
            scheduleRelationship=scheduleRelationship_json,
        )
        
        arrival_json = read_safe_json_key(json_data, 'Arrival')
        if arrival_json is not None:
            stopTimeUpdate.arrival = StopTime.from_gtfs_rt_json(arrival_json)
            
        departure_json = read_safe_json_key(json_data, 'Departure')
        if departure_json is not None:
            stopTimeUpdate.departure = StopTime.from_gtfs_rt_json(departure_json)
    
        return stopTimeUpdate
  
@dataclass
class Trip:
    tripId: str
    routeId: str
    startTime: str
    startDate: str
    scheduleRelationship: str
      
    @staticmethod
    def from_gtfs_rt_json(json_data: dict):
        tripId_json = read_safe_json_key(json_data, 'TripId')
        if tripId_json is None:
            print('ERROR - Trip.from_gtfs_rt_json - TripId cant be None')
            print(json_data.keys())
            sys.exit()
            
        routeId_json = read_safe_json_key(json_data, 'RouteId')
        if routeId_json is None:
            print('ERROR - Trip.from_gtfs_rt_json - RouteId cant be None')
            print(json_data.keys())
            sys.exit()
            
        startTime_json = read_safe_json_key(json_data, 'StartTime')
        if startTime_json is None:
            print('ERROR - Trip.from_gtfs_rt_json - StartTime cant be None')
            print(json_data.keys())
            sys.exit()
            
        startDate_json = read_safe_json_key(json_data, 'StartDate')
        if startDate_json is None:
            print('ERROR - Trip.from_gtfs_rt_json - StartDate cant be None')
            print(json_data.keys())
            sys.exit()
            
        scheduleRelationship_json = read_safe_json_key(json_data, 'ScheduleRelationship')
        if scheduleRelationship_json is None:
            print('ERROR - Trip.from_gtfs_rt_json - ScheduleRelationship cant be None')
            print(json_data.keys())
            sys.exit()
        
        trip = Trip(
            tripId=tripId_json,
            routeId=routeId_json,
            startTime=startTime_json,
            startDate=startDate_json,
            scheduleRelationship=scheduleRelationship_json,
        )
        
        return trip
  
@dataclass
class TripUpdate:
    trip: Trip
    stopTimeUpdate: List[StopTimeUpdate]
    
    @staticmethod
    def from_gtfs_rt_json(json_data: dict):
        trip_json = read_safe_json_key(json_data, 'Trip')
        if trip_json is None:
            print('ERROR - TripUpdate.from_gtfs_rt_json - Trip cant be None')
            print(json_data.keys())
            sys.exit()
        
        trip = Trip.from_gtfs_rt_json(trip_json)
        
        stopTimeUpdates: List[StopTimeUpdate] = []
        stop_times_update_gtfs_rt_json = read_safe_json_key(json_data, 'StopTimeUpdate', [])
        if stop_times_update_gtfs_rt_json is None:
            print('ERROR - TripUpdate.from_gtfs_rt_json - StopTimeUpdate cant be None')
            print(json_data.keys())
            sys.exit()
        
        for stop_time_update_json_data in stop_times_update_gtfs_rt_json:
            stop_time_update = StopTimeUpdate.from_gtfs_rt_json(stop_time_update_json_data)
            stopTimeUpdates.append(stop_time_update)
      
        tripUpdate = TripUpdate(trip, stopTimeUpdates)
    
        return tripUpdate
  
@dataclass
class Entity:
    id: str
    tripUpdate: TripUpdate
    isDeleted: Optional[bool] = None
  
    @staticmethod
    def from_gtfs_rt_json(json_data):
        id_json = read_safe_json_key(json_data, 'Id')
        if id_json is None:
            print('ERROR - Entity.from_gtfs_rt_json - Id cant be None')
            print(json_data.keys())
            sys.exit()
            
        tripUpdate_json = read_safe_json_key(json_data, 'TripUpdate')
        if tripUpdate_json is None:
            print('ERROR - Entity.from_gtfs_rt_json - TripUpdate cant be None')
            print(json_data.keys())
            sys.exit()
        
        entity = Entity(
            id=id_json,
            isDeleted=read_safe_json_key(json_data, 'IsDeleted'),
            tripUpdate=TripUpdate.from_gtfs_rt_json(tripUpdate_json)
        )
    
        return entity
    
    def as_json(self, light: bool):
        entity_json = asdict(self)
        if light:
            entity_json['tripUpdate']['stopTimeUpdate'] = {}
        
        return entity_json        

@dataclass
class GTFS_RT_Response:
    header: Header
    entity: List[Entity]
  
    @staticmethod
    def from_gtfs_rt_json(json_data: dict):
        header_json = read_safe_json_key(json_data, 'Header')
        if header_json is None:
            print('ERROR - GTFS_RT_Response.from_gtfs_rt_json - Header cant be None')
            print(json_data.keys())
            sys.exit()
        header = Header.from_gtfs_rt_json(header_json)
    
        entities: List[Entity] = []
        entities_json = read_safe_json_key(json_data, 'Entity')
        if entities_json is None:
            print('ERROR - GTFS_RT_Response.from_gtfs_rt_json - Entity cant be None')
            print(json_data.keys())
            sys.exit()
        
        for entity_json_data in entities_json:
            entity = Entity.from_gtfs_rt_json(entity_json_data)
            entities.append(entity)
    
        response = GTFS_RT_Response(header, entities)
    
        return response
    
    def compute_date_f(self) -> str:
        dt = datetime.datetime.fromtimestamp(self.header.timestamp)
        dt_f = dt.strftime("%Y-%m-%d %H:%M:%S")
        return dt_f