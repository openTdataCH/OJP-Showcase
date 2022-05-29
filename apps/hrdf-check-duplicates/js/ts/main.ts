import HRDF_Check_Duplicates_Controller from "./controllers/hrdf_check_duplicates_controller";

const hrdf_check_duplicates_controller = new HRDF_Check_Duplicates_Controller();
hrdf_check_duplicates_controller.check_available_datasets(hrdf_days => {
    if (hrdf_days.length === 0) {
        hrdf_check_duplicates_controller.set_error_message('No dataset found');
        return;
    }

    hrdf_check_duplicates_controller.load_days(hrdf_days);
});
