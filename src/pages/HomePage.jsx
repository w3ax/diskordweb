import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";

export default function HomePage()
{
    const navigate = useNavigate();

    async function handleFileUpload(file){
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

    const [selectedFile, setSelectedFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        setSelectedFile(file);
        setIsLoading(true)
        await handleFileUpload(file);
        setIsLoading(false)
    };

    return <>
        <div className={'flex-column d-flex justify-content-center align-items-center'}
             style={{background: '#1f2d39', height: '100vh', width: '100%'}}>
            <h1 className={'text-center mb-3 text-white'}
                style={{color: '#e0e0e0'}}>Home</h1>
            <form className={'bg-dark rounded-4'}
                  style={{height: '30vh', width: '45vh'}}>
                <input className={'btn btn-primary mb-5 mx-auto d-block p-0 mt-5'} type={'submit'} value={'View the storage'}
                       style={{height: '4.8vh', width: '30vh', fontSize: '1.6rem'}}>
                </input>
                <label className="btn btn-primary mb-5 mx-auto d-block p-0 ${isLoading ? 'disabled' : ''}"
                       style={{height: '4.8vh', width: '30vh', fontSize: '1.6rem', cursor: 'pointer', verticalAlign: 'middle', lineHeight: '4.8vh'}}>
                    {isLoading ? 'Uploading' : 'Upload'}
                    <input type="file" style={{display: 'none'}} onChange={handleFileSelect} disabled={isLoading}/>
                </label>
                <input className={'btn btn-primary mb-5 mx-auto d-block p-0'} type={'submit'} value={'Download'}
                       style={{height: '4.8vh', width: '30vh', fontSize: '1.6rem'}}>
                </input>
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