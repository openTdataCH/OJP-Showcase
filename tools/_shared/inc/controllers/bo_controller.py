import os, sys

from typing import TypedDict

class BusinessOrganisationGtfsRtCsvRow(TypedDict):
    sboid: str
    descriptionEn: str
    abbreviationEn: str
    vdvBetreiberId: str
    source: str
    etAUS: str
    ptREFAUS: str
    complete: str
    comment: str
