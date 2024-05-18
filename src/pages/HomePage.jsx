import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faRefresh, faSpinner, faWindowClose } from '@fortawesome/free-solid-svg-icons';
import Download from '../Functions/Download.jsx'

export default function HomePage()
{
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [fileList, setFileList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredFiles, setFilteredFiles] = useState(fileList);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [notification, setNotification] = useState(null);
    const [isNotificationVisible, setIsNotificationVisible] = useState(false);
    const [notificationTimer, setNotificationTimer] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    async function uploadFile(file){
        setUploadProgress(0);
        const chunkSize = 20 * 1024 * 1024;
        const fileSize = file.size;
        const fileName = file.name;
        const numChunks = Math.ceil(fileSize / chunkSize);
        const progressPerChunk = 400 / numChunks;
        const chunks = [];
        for (let i = 0; i < numChunks; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, fileSize);
            const chunk = file.slice(start, end);
            const formData = new FormData()
            formData.append('file', chunk, fileName +'-chunk-' + i);
            const hash = await getHashFromChunk(formData)
                .catch(error => console.error('chunkHash: ', error));
            chunks.push({
                size:chunk.size,
                index:i,
                hash:hash,
                formData:formData
            });
        }

        const hashes=[];
        chunks.forEach(chunk => hashes.push(chunk.hash));

        const fileHash = await getHashFromHashes(hashes)
            .catch(error => console.error('fileHash: ', error));

        const fileId = await getFileId(file.name, file.size, fileHash, false, numChunks, chunkSize)
            .catch(error => console.error('fileId: ', error));

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            await uploadChunk(fileId, chunk)
                .catch(error => console.error('chunk: ', error));
            smoothProgressUpdate(((i + 1) / numChunks) * progressPerChunk);
        }
        fetchFiles()
        showNotification(`The file "${file.name}" has been uploaded.`);
    }

    const navigate = useNavigate();
    useEffect(() => {
        const myHeaders = new Headers();
        myHeaders.append("Authorization", "Bearer " + localStorage.getItem("token"));
        const requestOptions = {
            method: "GET",
            headers: myHeaders,
            redirect: "follow"
        };

        fetch("http://46.63.69.24:3000/api/user/validate", requestOptions)
            .then((response) => {
                if(!response.ok){
                    navigate('/login')
                }
            })
            .catch((error) => console.error(error));
    }, []);

    useEffect(() => {
        fetchFiles();
    }, []);

    useEffect(() => {
        handleSearch()
    }, [searchTerm, fileList]);


    async function fetchFiles() {
        const myHeaders = new Headers();
        myHeaders.append("Authorization", "Bearer " + localStorage.getItem("token"));
        const requestOptions = {
            method: 'GET',
            headers: myHeaders,
            };
        const response = await fetch('http://46.63.69.24:3000/api/user/files', requestOptions);
        const files = await response.json();
        if(files){
            setFileList(files);
        }
        else {
            setFileList([])
        }
        console.log(files)
    }


    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        setIsLoading(true)
        await uploadFile(file);
        setIsLoading(false)
        setUploadedFiles([...uploadedFiles, file]);
    };

    const handleFileDownload = async (file) => {
        setIsDownloading(prevState => ({...prevState, [file.id]:true}))
        await Download(file);
        setIsDownloading(prevState => ({...prevState, [file.id]:false}))
        showNotification(`The file "${file.name}" has been downloaded.`);
    };

    const handleSearch = () => {
        const filtered = fileList.filter(file => file.name.toLowerCase().includes(searchTerm.toLowerCase()));
        setFilteredFiles(filtered);
    };
    const [contextMenuVisible, setContextMenuVisible] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({ top: 0, left: 0 });
    const [selectedFile, setSelectedFile] = useState(null);

    const handleContextMenu = (event, file) => {
        event.preventDefault();
        setSelectedFile(file);
        setContextMenuVisible(true);
        setContextMenuPosition({ top: event.clientY, left: event.clientX });
    };


    async function handleDelete(file) {
        const myHeaders = new Headers();
        myHeaders.append("Authorization", "Bearer " + localStorage.getItem("token"));
        const requestOptions = {
            method: 'DELETE',
            headers: myHeaders,
        };
        const response = await fetch(`http://46.63.69.24:3000/api/files/${file.id}`, requestOptions);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error)
        }
        setContextMenuVisible(false);
        fetchFiles();
        showNotification(`The file "${file.name}" has been deleted.`);
    }

    async function setFilePrivacy(file, isPublic) {
        if(isPublic===file.isPublic)
            return;
        const myHeaders = new Headers();
        myHeaders.append("Authorization", "Bearer " + localStorage.getItem("token"));
        myHeaders.append("Content-Type", "application/json");
        const requestOptions = {
            method: 'PATCH',
            headers: myHeaders,
            body: JSON.stringify({isPublic})
        };
        const response = await fetch(`http://46.63.69.24:3000/api/files/${file.id}/privacy`, requestOptions)
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error)
        }
        const newFileList = fileList.map((fileCringe) => {
            if (fileCringe.id === file.id){
                fileCringe.isPublic = isPublic;
                return fileCringe;
            }
            else{
                return fileCringe;
            }
        })
        setFileList(newFileList);
        showNotification(`The file "${file.name}" link has been copied.`);
    }

    async function handleShareLink(file) {
        await setFilePrivacy(file, true);
        const downloadPageLink = `${window.location.origin}/files/${file.id}`;

        navigator.clipboard.writeText(downloadPageLink)
            .catch((error) => console.error(error));
        setContextMenuVisible(false);
    }

    async function handleMakePrivate(file) {
        await setFilePrivacy(file, false);
        setContextMenuVisible(false);
    }

    const showNotification = (message) => {
        setNotification(message);
        setIsNotificationVisible(true);
        if (notificationTimer) {
            clearTimeout(notificationTimer);
        }
        const timer = setTimeout(() => {
            setIsNotificationVisible(false);
        }, 5000);
        setNotificationTimer(timer);
    };

    async function smoothProgressUpdate(targetProgress) {
        return new Promise((resolve) => {
            const stepTime = 5;
            const steps = 50;
            const currentProgress = uploadProgress;
            const stepSize = (targetProgress - currentProgress) / steps;
            let progress = currentProgress;
            let stepCount = 0;

            const interval = setInterval(() => {
                progress += stepSize;
                stepCount += 1;
                if (stepCount >= steps || progress >= targetProgress) {
                    progress = targetProgress;
                    clearInterval(interval);
                    resolve();
                }
                setUploadProgress(Math.round(progress));
            }, stepTime);
        });
    }



    return <>
        <div id={'contextMenu'} className={'context-menu'} style={{display: 'none'}}>
            <ul>
                <li><a href={'#'} id={'DeleteFile'}>Delete</a></li>
            </ul>
        </div>
        <div className={'flex-column d-flex justify-content-center align-items-center'}
             style={{background: '#1f2d39', height: '100vh', width: '100%'}}>
            <h1 className={'text-center mb-3 text-white'} style={{color: '#e0e0e0'}}>Home</h1>
            <form className={'bg-dark rounded-4'}
                  style={{
                      height: '65vh',
                      maxHeight: '60%',
                      width: '70%',
                      maxWidth: '50%',
                      padding: '2rem',
                      marginBottom: '5%'
                  }}>
                <div
                    className="d-flex justify-content-center align-items-center mb-4">
                    <label
                        className="btn btn-primary d-block p-0 ${isLoading ? 'disabled' : ''} mx-5"
                        style={{
                            height: '4.8%',
                            width: '30%',
                            fontSize: '1.6rem',
                            cursor: 'pointer',
                            lineHeight: '4.8vh',
                        }}>
                        {isLoading ? 'Uploading' : 'Upload'}
                        <input type="file" style={{display: 'none'}} onChange={handleFileSelect} disabled={isLoading}/>
                    </label>
                </div>
                <div className="mx-auto" style={{
                    background: '#C0C0C0',
                    width: '90%',
                    height: '65vh',
                    maxHeight: '80%',
                    borderRadius: '5px',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        marginBottom: '5px',
                        padding: '5px',
                        fontSize: '1.1rem',
                        lineHeight: '3vh',
                        borderRadius: '5px 5px 0 0',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        background: '#f0f0f0',
                    }}>Storage
                    </div>
                    <div style={{
                        textAlign: 'center',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.5vh'
                    }}>
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(event) => {
                                setSearchTerm(event.target.value)
                            }}
                            style={{
                                margin: '1% 2% 1% 2.5%',
                                padding: '6px',
                                width: '90%',
                                borderRadius: '3px',
                                border: '1px solid #ccc',
                                textAlign: 'center',
                            }}
                        />
                        <button style={{
                            cursor: 'pointer',
                            background: 'none',
                            border: 'none',
                            marginRight: '2.5%',
                        }}
                        onClick={fetchFiles}>
                            <FontAwesomeIcon icon={faRefresh}/>
                        </button>
                    </div>
                    <div className="file-list-container mx-auto" style={{
                        overflowY: 'auto',
                        width: '100%',
                        height: 'calc(100% - 20%)',
                        borderRadius: '5px',
                    }}>
                        <ul className={'file-list'} style={{listStyle: 'none', padding: '0'}}>
                            {filteredFiles.map((file, index) => {
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
                                const fileName = file.name.length > 40 ? file.name.slice(0,40) + "..." : file.name;
                                return (
                                    <li key={index} onContextMenu={(e) => handleContextMenu(e, file)}
                                        style={{
                                        marginBottom: '4px',
                                        marginLeft: '20px',
                                        marginRight: '20px',
                                        padding: '5px',
                                        borderRadius: '3px',
                                        textAlign: 'center',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}>
                                        <strong style={{width: '93%', textAlign: 'left'}}>{fileName}</strong>
                                        <div style={{width: '31%', display: 'flex', justifyContent: 'space-between'}}>
                                            <span style={{marginRight: '5%'}}>{fileSize}</span>
                                            <FontAwesomeIcon icon={isDownloading[file.id] ? faSpinner : faDownload}
                                                 style={{
                                                    marginLeft: 'auto',
                                                    cursor: 'pointer',
                                                    marginTop: '4%'
                                                 }}
                                                 onClick={() => handleFileDownload(file)}
                                            />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                        {contextMenuVisible && (
                            <div id="contextMenu" className={'context-menu'} style={{
                                width: '170px',
                                height: 'auto',
                                position: 'fixed',
                                top: contextMenuPosition.top,
                                left: contextMenuPosition.left,
                                background: 'white',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                            }}>
                                <div className={'context-menu-header'}
                                     style={{
                                         background: 'slategrey',
                                         padding: '1.5px',
                                         display: 'flex',
                                         justifyContent: 'space-between',
                                     }}>
                                    <strong style={{marginLeft: '10px', marginTop: '1px', fontSize: '0.9rem'}}>
                                        {selectedFile.name.length > 14 ? `${selectedFile.name.substring(0, 14)}..` : selectedFile.name}
                                    </strong>
                                    <FontAwesomeIcon icon={faWindowClose}
                                                     style={{
                                                         cursor: 'pointer',
                                                         margin: '3% 5% 3% auto',
                                                     }}
                                                     onClick={() => {
                                                         setContextMenuVisible(false)
                                                     }}
                                    />
                                </div>
                                <div className={'context-menu-content'} style={{borderBottom: '1px solid #ccc'}}></div>
                                <div>
                                    <strong style={{flex: '1'}}><a href={'#'} onClick={() => handleDelete(selectedFile)}
                                                                   style={{
                                                                       display: 'block',
                                                                       width: '100%',
                                                                       height: '100%',
                                                                       textDecoration: 'none',
                                                                       color: 'black',
                                                                       padding: '10.5px',
                                                                       fontSize: '1.2rem',
                                                                   }}
                                                                   onMouseOver={(e) => e.target.style.backgroundColor = 'lightgray'}
                                                                   onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                                    >Delete</a></strong>
                                </div>
                                <div>
                                    <strong style={{flex: '1'}}><a href={'#'}
                                                                   onClick={() => handleShareLink(selectedFile)}
                                                                   style={{
                                                                       display: 'block',
                                                                       width: '100%',
                                                                       height: '100%',
                                                                       textDecoration: 'none',
                                                                       color: 'black',
                                                                       padding: '10.5px',
                                                                       fontSize: '1.2rem',
                                                                   }}
                                                                   onMouseOver={(e) => e.target.style.backgroundColor = 'lightgray'}
                                                                   onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                                    >Share</a></strong>
                                </div>
                                {selectedFile.isPublic && (
                                    <div>
                                        <strong style={{flex: '1'}}><a href={'#'}
                                                                       onClick={() =>handleMakePrivate(selectedFile)}
                                                                       style={{
                                                                           display: 'block',
                                                                           width: '100%',
                                                                           height: '100%',
                                                                           textDecoration: 'none',
                                                                           color: 'black',
                                                                           padding: '10.5px',
                                                                           fontSize: '1.2rem',
                                                                       }}
                                                                       onMouseOver={(e) => e.target.style.backgroundColor = 'lightgray'}
                                                                       onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                                        >Set as private</a></strong>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                {isNotificationVisible && (
                    <div className="notification" style={{
                        position: 'fixed',
                        top: '10px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: '#28a745',
                        color: '#fff',
                        padding: '10px 20px',
                        borderRadius: '5px',
                        zIndex: 1000,
                        textAlign: 'center',
                    }}>
                        {notification}
                    </div>
                )}
                {isLoading && (
                    <div className="upload-progress" style={{ width: '100%', textAlign: 'center', color: '#fff' }}>
                        Uploaded: {uploadProgress}%
                    </div>
                )}
            </form>
        </div>
    </>;
}


async function getHashFromChunk(formData) {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "multipart/form-data");
    const requestOptions = {
        method: 'POST',
        body: formData,
    };
    const response = await fetch('http://46.63.69.24:3000/api/hash/file', requestOptions);
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error)
    }
    return data.hash;
}

async function getHashFromHashes(hashes) {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: JSON.stringify({hashes}),
    };
    const response = await fetch('http://46.63.69.24:3000/api/hash/[]string', requestOptions)
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error);
    }
    return data.hash;
}

async function getFileId(fileName, fileSize, fileHash, isPublic, numChunks, chunkSize) {
    const myHeaders = new Headers();
    myHeaders.append('Content-Type', 'application/json');
    myHeaders.append("Authorization", "Bearer " + localStorage.getItem("token"));
    const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: JSON.stringify({
            name:fileName,
            size:fileSize,
            hash:fileHash,
            isPublic:isPublic,
            numChunks:numChunks,
            chunkSize:chunkSize
        }),
    };
    const response = await fetch('http://46.63.69.24:3000/api/files/upload', requestOptions);
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error);
    }
    return data.fileId;
}

async function uploadChunk(fileId, chunk) {
    const myHeaders = new Headers();
    myHeaders.append("Authorization", "Bearer " + localStorage.getItem("token"));
    const formData = chunk.formData;
    formData.append('hash', chunk.hash);
    formData.append('size', chunk.size);
    formData.append('index', chunk.index);

    const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: formData,
    };
    const url = `http://46.63.69.24:3000/api/files/${fileId}/chunks/upload`;
    const response = await fetch(url, requestOptions);
    if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error);
    }
}