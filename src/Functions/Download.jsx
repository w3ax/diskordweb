import mime from "mime";

export default async function Download(file){
    const myHeaders = new Headers();
    myHeaders.append("Authorization", "Bearer " + localStorage.getItem("token"));
    const requestOptions = {
        method: 'GET',
        headers: myHeaders,
    };
    const response = await fetch(import.meta.env.VITE_API_SERVER+`files/${file.id}/download`, requestOptions);
    const fileChunks = await response.json();
    const chunks = [];

    for(const chunk of fileChunks) {
        const response = await fetch(import.meta.env.VITE_API_SERVER+`files/${file.id}/chunks/${chunk.index}/download`, requestOptions)
        if(!response.ok){
            const top = await response.json();
            throw new Error(top.error)
        }
        const blob = await response.blob();
        chunks.push(blob);

    }

    const fileBlob = new Blob(chunks, {type: mime.getType(file.name)});
    const downloadUrl = document.createElement("a");
    downloadUrl.href = window.URL.createObjectURL(fileBlob);
    downloadUrl.download = file.name;
    downloadUrl.click();

}