import GTFS_DB_Controller from './controllers/GTFS_DB_Controller';
import GTFS_RT_Reporter from './controllers/GTFS_RT_Reporter';
import Progress_Controller from './controllers/Progress_Controller';

const nowDate = new Date();

const progress_controller = new Progress_Controller();
progress_controller.setIdle();

const gtfs_rt_reporter = new GTFS_RT_Reporter();

const gtfs_db_controller = new GTFS_DB_Controller(nowDate);
gtfs_db_controller.progress_controller = progress_controller;
gtfs_db_controller.gtfs_rt_reporter = gtfs_rt_reporter;

gtfs_db_controller.loadGTFS_Catalog(() => {
    gtfs_db_controller.load_resources(() => {
        console.log('loaded');
    });
});

