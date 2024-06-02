import { GTFS_DB_CatalogController } from './controllers/GTFS_DB_CatalogController';
import GTFS_DB_Controller from './controllers/GTFS_DB_Controller';
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

    const gtfs_rt_reporter = new GTFS_RT_Reporter();
    
    const gtfs_db_controller = new GTFS_DB_Controller(catalogItem.gtfs_day);
    gtfs_db_controller.progress_controller = progress_controller;
    gtfs_db_controller.gtfs_rt_reporter = gtfs_rt_reporter;

    await gtfs_db_controller.load_resources();
}

main();
