import {useEffect, useState, useRef} from "react";
import {useNavigate} from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faRefresh, faSpinner, faWindowClose } from '@fortawesome/free-solid-svg-icons';
import Download from '../Functions/Download.jsx'
import useNotification from '../Functions/Notification';
import {smoothProgressUpdate} from "../Functions/Progress.jsx";

export default function HomePage()
{
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [fileList, setFileList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredFiles, setFilteredFiles] = useState(fileList);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const progressRef = useRef(uploadProgress);
    const [email, setEmail] = useState('');
    const { Notification, showNotification } = useNotification();
    progressRef.current = uploadProgress;

    async function uploadFile(file){
        setUploadProgress(0);
        const chunkSize = 20 * 1024 * 1024;
        const fileSize = file.size;
        const fileName = file.name;
        const numChunks = Math.ceil(fileSize / chunkSize);
        const progressPerChunk = 100 / numChunks;
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
            const isLastChunk = i === chunks.length - 1;
            const chunk = chunks[i];

            let duration = 6000;
            if (isLastChunk) {
                const lastChunkRatio = chunk.size / chunkSize;
                duration = duration * lastChunkRatio;
            }

            smoothProgressUpdate(progressRef.current, (i + 1) * progressPerChunk, duration, setUploadProgress);

            await uploadChunk(fileId, chunk).catch(error => {
                console.error('chunk: ', error);
                smoothProgressUpdate(progressRef.current, (i + 1) * progressPerChunk, duration * 2, setUploadProgress);
            });
        }
        smoothProgressUpdate(progressRef.current, 100, 6000, setUploadProgress);
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

        fetch(import.meta.env.VITE_API_SERVER+"user/validate", requestOptions)
            .then((response) => {
                if(!response.ok){
                    navigate('/login')
                }
                return response.json();
            })
            .then((data) => {
                setEmail(data.userEmail);
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
        const response = await fetch(import.meta.env.VITE_API_SERVER+'user/files', requestOptions);
        const files = await response.json();
        if(files){
            setFileList(files);
        }
        else {
            setFileList([])
        }
        console.log(files)
    }

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate('/login')
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
        const response = await fetch(import.meta.env.VITE_API_SERVER+`files/${file.id}`, requestOptions);
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
        const response = await fetch(import.meta.env.VITE_API_SERVER+`files/${file.id}/privacy`, requestOptions)
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
    }

    async function handleShareLink(file) {
        await setFilePrivacy(file, true);
        const downloadPageLink = `${window.location.origin}/files/${file.id}`;

        function copyToClipboard(text) {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
            } catch (err) {
                console.error('Unable to copy to clipboard', err);
            }
            document.body.removeChild(textArea);
        }
        navigator.clipboard.writeText(downloadPageLink)
            .catch(() => copyToClipboard(downloadPageLink));
        setContextMenuVisible(false);
        showNotification(`The file "${file.name}" link has been copied.`);
    }

    async function handleMakePrivate(file) {
        await setFilePrivacy(file, false);
        setContextMenuVisible(false);
        showNotification(`The file "${file.name}" made as private.`);
    }



    return <>
        <div id={'contextMenu'} className={'context-menu'} style={{display: 'none'}}>
            <ul>
                <li><a href={'#'} id={'DeleteFile'}>Delete</a></li>
            </ul>
        </div>
        <div style={{background: '#1f2d39', height: '100vh', width: '100%', position: 'relative'}}>
            <div style={{ top: 0, left: 0, padding: '1rem', color: 'lightgray'}}>
                <button onClick={handleLogout}>Log out</button> {email}
            </div>
            <div className={'flex-column d-flex justify-content-center align-items-center my-5'}>
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
                            <input type="file" style={{display: 'none'}} onChange={handleFileSelect}
                                   disabled={isLoading}/>
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
                                    const fileName = file.name.length > 40 ? file.name.slice(0, 40) + "..." : file.name;
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
                                            <div style={{
                                                width: '31%',
                                                display: 'flex',
                                                justifyContent: 'space-between'
                                            }}>
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
                                    <div className={'context-menu-content'}
                                         style={{borderBottom: '1px solid #ccc'}}></div>
                                    <div>
                                        <strong style={{flex: '1'}}><a href={'#'}
                                                                       onClick={() => handleDelete(selectedFile)}
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
                                                                           onClick={() => handleMakePrivate(selectedFile)}
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
                    <Notification/>
                    {isLoading && (
                        <div className="upload-progress"
                             style={{width: '100%', textAlign: 'center', color: '#fff', marginTop: '2%'}}>
                            Uploaded: {uploadProgress.toFixed(0)}%
                        </div>
                    )}
                </form>
            </div>
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
    const response = await fetch(import.meta.env.VITE_API_SERVER+'hash/file', requestOptions);
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
    const response = await fetch(import.meta.env.VITE_API_SERVER+'hash/[]string', requestOptions)
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
            name: fileName,
            size: fileSize,
            hash: fileHash,
            isPublic: isPublic,
            numChunks: numChunks,
            chunkSize: chunkSize
        }),
    };
    const response = await fetch(import.meta.env.VITE_API_SERVER+'files/upload', requestOptions);
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
    const url = import.meta.env.VITE_API_SERVER+`files/${fileId}/chunks/upload`;
    const response = await fetch(url, requestOptions);
    if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error);
    }
}