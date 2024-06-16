<?php

class ConfigHelpers {
    public static function loadConfigAtPath($config_path, $root_path = null) {
        $app_config_s = file_get_contents($config_path);
        if ($root_path !== null) {
            $app_config_s = str_replace('[APP_PATH]', $root_path, $app_config_s);
        }
        
        $yaml = new Yaml();
        $app_config = $yaml->loadString($app_config_s);

        return $app_config;
    }
}