import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";

export default function HomePage()
{
    const [selectedFile, setSelectedFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [fileList, setFileList] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredFiles, setFilteredFiles] = useState(fileList);

    async function uploadFile(file){
        const chunkSize = 20 * 1024 * 1024;
        const fileSize = file.size;
        const fileName = file.name;
        const numChunks = Math.ceil(fileSize / chunkSize);
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

        for (const chunk of chunks) {
            {
                await uploadChunk(fileId, chunk)
                    .catch(error => console.error('chunk: ', error));
            }
        }
    }

    async function downloadFile(filename) {
        try {
            const response = await fetch(`http://46.63.69.24:3000/api/download/${filename}`);
            const blob = await response.blob();

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error:', error);
        }
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

    const toggleFileSelection = (fileName) => {
        if (selectedFiles.includes(fileName)) {
            setSelectedFiles(selectedFiles.filter(file => file !== fileName));
        } else {
            setSelectedFiles([...selectedFiles, fileName]);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, []);


    async function fetchFiles() {
        try {
            const response = await fetch('http://46.63.69.24:3000/api/files');
            const files = await response.json();
            setFileList(files);
        } catch (error) {
            console.error('Error:', error);
        }
    }


    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        setSelectedFile(file);
        setIsLoading(true)
        await uploadFile(file);
        setIsLoading(false)
    };
    const filesList = [
        { name: "ттттт" },
        { name: "аааа" },
        { name: "рарара" },
        { name: "11111" },
        { name: "чччччч2" }
    ];


    const handleSearch = (event) => {
        const searchTerm = event.target.value;
        setSearchTerm(searchTerm);
        const filtered = filesList.filter(file => file.name.toLowerCase().includes(searchTerm.toLowerCase()));
        setFilteredFiles(filtered);
    };


    return <>
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
                    <input className={'btn btn-primary d-block p-0 mx-5'} type={'submit'}
                           value={'Download'}
                           style={{
                               height: '4.8%',
                               width: '30%',
                               fontSize: '1.6rem',
                               cursor: 'pointer',
                               lineHeight: '4.8vh',
                           }}>
                    </input>
                </div>
                <div className="file-list-container mx-auto" style={{
                    background: '#C0C0C0',
                    width: '90%',
                    height: '65vh',
                    maxHeight: '80%',
                    borderRadius: '5px',
                    overflowY: 'auto'
                }}>
                    <ul className="file-list" style={{listStyle: 'none', padding: 0}}>
                        <li style={{
                            marginBottom: '5px',
                            padding: '5px',
                            fontSize: '1.1rem',
                            lineHeight: '3vh',
                            borderRadius: '5px 5px 0 0',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            background: '#f0f0f0', // Додали фон для тексту "Storage"
                        }}>Storage
                        </li>
                        <li>
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={handleSearch}
                                style={{
                                    margin: '1% 2% 1% 2.5%',
                                    padding: '6px',
                                    width: '95%',
                                    borderRadius: '3px',
                                    border: '1px solid #ccc',
                                    textAlign: 'center',
                                }}
                            />
                        </li>
                        {filteredFiles.map((file, index) => (
                            <li key={index} style={{
                                marginBottom: '4px',
                                padding: '5px',
                                borderRadius: '3px',
                                textAlign: 'center',
                                background: selectedFiles.includes(file.name) ? '#cceeff' : 'none', // Змінюємо фон для виділених файлів
                                cursor: 'pointer',
                            }} onClick={() => toggleFileSelection(file.name)}>
                                <strong>{file.name}</strong>
                            </li>
                        ))}
                    </ul>
                </div>
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
    const response = await fetch('http://46.63.69.24:3000/api/file/upload', requestOptions);
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
    const url = `http://46.63.69.24:3000/api/file/${fileId}/chunk/upload`;
    const response = await fetch(url, requestOptions);
    if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error);
    }
}