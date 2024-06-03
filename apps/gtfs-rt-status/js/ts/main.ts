import { GTFS_DB_CatalogController } from './controllers/GTFS_DB_CatalogController';
import GTFS_RT_Reporter from './controllers/GTFS_RT_Reporter';
import Progress_Controller from './controllers/Progress_Controller';

async function main() {
    const progress_controller = new Progress_Controller();
    progress_controller.setIdle();
    
    const dbCatalog = await GTFS_DB_CatalogController.fetchLatestCatalog();
    const dbCatalogController = new GTFS_DB_CatalogController(dbCatalog);
    const catalogItem = dbCatalogController.computeDbCatalogItem();

    if (catalogItem === null) {
        progress_controller.setError('No GTFS DB found');
        return;
    }

    const nowDate = new Date();
    const gtfs_rt_reporter = new GTFS_RT_Reporter(progress_controller, catalogItem.gtfs_day, nowDate);
    let customReportFilename: string | null = null;
    
    const queryParams = new URLSearchParams(document.location.search);
    const customReportS = queryParams.get('report');
    if (customReportS !== null) {
        const customReport = await GTFS_RT_Reporter.loadCustomReport(customReportS);
        if (customReport === null) {
            progress_controller.setError('No custom report found');
            return;
        }

        const gtfsDayMatches = customReport.metadata.gtfs_db_filename.match(/gtfs_([0-9-]{10}).sqlite/);
        if (gtfsDayMatches === null) {
            progress_controller.setError('No DB found in the report');
            return;
        }

        customReportFilename = customReport.metadata.gtfs_rt_filename;
    }
    await gtfs_rt_reporter.load_resources();

    gtfs_rt_reporter.setReady();
}

main();
