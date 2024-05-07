import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";

export default function HomePage()
{
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
            let formData = new FormData();
            formData.append('file', chunk, fileName +'-chunk-' + i);

            const requestOptions = {
                method: 'POST',
                body: formData,
            };
            try {
                const response = await fetch('http://46.63.69.24:3000/api/hashes/file', requestOptions);
                const data = await response.json();
                if (response.ok) {
                    const chunkObj={
                        size:chunk.size,
                        index:i,
                        hash:data.hash,
                        formData:formData
                    }
                    chunks.push(chunkObj);
                    console.log(data);
                }
                else{
                    console.log('error', data.error)
                }
            }
            catch (error) {
                console.error('Error:', error);
            }
        }
        const hashes=[];
        chunks.forEach(chunk => {hashes.push(chunk.hash)});
        let fileHash="";
        let requestOptions = {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({hashes}),
        };
        try {
            const response = await fetch('http://46.63.69.24:3000/api/hashes/hashes', requestOptions);
            const data = await response.json();
            if (response.ok) {
                fileHash = data.hash;
            }
            else{
                console.log('error', data.error)
            }
        }
        catch (error) {
            console.error('Error:', error);
        }
        const myHeaders = new Headers();
        myHeaders.append('Content-Type', 'application/json');
        myHeaders.append("Authorization", "Bearer " + localStorage.getItem("token"));
        requestOptions = {
            method: 'POST',
            headers: myHeaders,
            body: JSON.stringify({
                name:file.name,
                size:file.size,
                hash:fileHash,
                isPublic:false,
                numChunks:numChunks,
                chunkSize:chunkSize
            }),
        };
        console.log(hashes)
        console.log(fileHash)

        let fileID = null;
        console.log(requestOptions);
        try {
            const response = await fetch('http://46.63.69.24:3000/api/user/file/upload', requestOptions);
            const data = await response.json();
            if (response.ok) {
                fileID = data.fileID;
            }
            else{
                console.log('error', data.error)
            }
        }
        catch (error) {
            console.error('Error:', error);
        }
        for (const chunk of chunks) {
            {
                const myHeaders = new Headers();
                myHeaders.append("Authorization", "Bearer " + localStorage.getItem("token"));
                let formData = chunk.formData;
                formData.append('fileID', fileID);
                formData.append('hash', chunk.hash);
                formData.append('size', chunk.size);
                formData.append('index', chunk.index);

                const requestOptions_ = {
                    method: 'POST',
                    headers: myHeaders,
                    body: formData,
                };

                try {
                    const response = await fetch('http://46.63.69.24:3000/api/user/file/chunk/upload', requestOptions_);
                    const data = await response.json()
                    if (response.ok) {
                        console.log('ok')
                    }
                    else{
                        console.log('error', data.error)
                    }
                }
                catch (error) {
                    console.error('Error:', error);
                }
            }
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
            .then((result) => console.log(result))
            .catch((error) => console.error(error));
    }, []);

    const [selectedFile, setSelectedFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        setSelectedFile(file);
        setIsLoading(true)
        await uploadFile(file);
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