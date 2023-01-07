import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ConsolidatedReportComponent } from './hrdf-duplicates/consolidated-report.component';
import { PublicationReportComponent } from './hrdf-duplicates/publication-report.component';

const routes: Routes = [
  { path: 'report', component: PublicationReportComponent },
  { path: 'all', component: ConsolidatedReportComponent },
  { path: '', redirectTo: '/report', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
