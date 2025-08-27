import os, sys

import json

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
  
    @staticmethod
    def from_gtfs_rt_json(json_data: dict):
        header = Header(
            gtfsRealtimeVersion=json_data['GtfsRealtimeVersion'],
            incrementality=json_data['Incrementality'],
            timestamp=json_data['Timestamp'],
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
        stopTime.delay = json_data.get('Delay', None)
        stopTime.time = json_data.get('Time', None)
        stopTime.scheduleRelationship = json_data.get('ScheduleRelationship', None)

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
        stopSequence = json_data['StopSequence']
        stopId = json_data['StopId']
        scheduleRelationship = json_data['ScheduleRelationship']

        stopTimeUpdate = StopTimeUpdate(
            stopSequence=stopSequence,
            stopId=stopId,
            scheduleRelationship=scheduleRelationship,
        )
    
        if 'Arrival' in json_data:
            stopTimeUpdate.arrival = StopTime.from_gtfs_rt_json(json_data['Arrival'])
        if 'Departure' in json_data:
            stopTimeUpdate.departure = StopTime.from_gtfs_rt_json(json_data['Departure'])
    
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
        trip = Trip(
            tripId=json_data['TripId'],
            routeId=json_data['RouteId'],
            startTime=json_data['StartTime'],
            startDate=json_data['StartDate'],
            scheduleRelationship=json_data['ScheduleRelationship'],
        )
        
        return trip
  
@dataclass
class TripUpdate:
    trip: Trip
    stopTimeUpdate: List[StopTimeUpdate]
    
    @staticmethod
    def from_gtfs_rt_json(json_data: dict):
        trip = Trip.from_gtfs_rt_json(json_data['Trip'])
        
        stopTimeUpdates: List[StopTimeUpdate] = []
        stop_times_update_gtfs_rt_json = json_data.get('StopTimeUpdate', [])
        for stop_time_update_json_data in stop_times_update_gtfs_rt_json:
            stop_time_update = StopTimeUpdate.from_gtfs_rt_json(stop_time_update_json_data)
            stopTimeUpdates.append(stop_time_update)
      
        tripUpdate = TripUpdate(trip, stopTimeUpdates)
    
        return tripUpdate
  
@dataclass
class Entity:
    id: str
    isDeleted: bool
    tripUpdate: TripUpdate
  
    @staticmethod
    def from_gtfs_rt_json(json_data):
        entity = Entity(
            id=json_data['Id'],
            isDeleted=json_data['IsDeleted'],
            tripUpdate=TripUpdate.from_gtfs_rt_json(json_data['TripUpdate'])
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
        header = Header.from_gtfs_rt_json(json_data['Header'])
    
        entities: List[Entity] = []
        for entity_json_data in json_data['Entity']:
            entity = Entity.from_gtfs_rt_json(entity_json_data)
            entities.append(entity)
    
        response = GTFS_RT_Response(header, entities)
    
        return response
