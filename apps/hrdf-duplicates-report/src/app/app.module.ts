import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HttpService } from './hrdf-duplicates/services/http-service';

import { ConsolidatedReportComponent } from './hrdf-duplicates/consolidated-report.component';
import { PublicationReportComponent } from './hrdf-duplicates/publication-report.component';

@NgModule({
  declarations: [
    AppComponent,
    
    ConsolidatedReportComponent,
    PublicationReportComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule, ReactiveFormsModule,
  ],
  providers: [HttpService],
  bootstrap: [AppComponent]
})
export class AppModule { }
