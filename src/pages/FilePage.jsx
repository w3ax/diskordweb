import {useFile} from "../Context/FileContext.jsx";
import {Navigate} from "react-router-dom";
import Download from '../Functions/Download.jsx'
import React from "react";
import {Card} from "react-bootstrap";

export default function FilePage() {

    const {file} = useFile();

    const [isDownloading, setIsDownloading] = React.useState(false)

    const getFileSize = (file) => {
        const fileSizeKB = (file.size / 1024).toFixed(2);
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        const fileSizeGB = (file.size / (1024 * 1024 * 1024)).toFixed(2);
        let fileSize = '';
        if (fileSizeGB > 1) {
            fileSize = `${fileSizeGB} GB`;
        } else if (fileSizeMB > 1) {
            fileSize = `${fileSizeMB} MB`;
        } else {
            fileSize = `${fileSizeKB} KB`;
        }
        return fileSize
    }


    const handleFileDownload = async (file) => {
        setIsDownloading(true)
        await Download(file);
        setIsDownloading(false)
    };

    return(
        file ?
            <>
                <div className={'flex-column d-flex justify-content-center align-items-center'}
                     style={{background: '#1f2d39', height: '100vh', width: '100%'}}>
                    <h2 className={'text-center mb-3 text-white'} style={{color: '#e0e0e0'}}>File</h2>
                    <Card className={'rounded-4 p-4'}>
                        <div  className="mb-4 d-flex text-center justify-content-between align-items-center">
                            <strong>{file.name}</strong>
                            <p className={'ms-5 my-0'}>{getFileSize(file)}</p>
                        </div>
                        <button
                            className="btn btn-primary p-3 px-5 mx-auto"
                            disabled={isDownloading}
                            onClick={() => handleFileDownload(file)}>{isDownloading ? 'Downloading' : 'Download'}
                        </button>
                    </Card>
                </div>
            </>
            : <Navigate to='/404'/>
    )
}